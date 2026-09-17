"use client";

import {
  deleteNote as deleteNoteDoc,
  getNote,
  getRecentNotes,
  saveNote,
} from "@/lib/firestore";
import { isEmptyNote, previousNotes } from "@/lib/notes";
import type { Note } from "@/types/lifeos";
import { useCallback, useEffect, useRef, useState } from "react";

/** Idle time after the last keystroke before the note is written. */
export const AUTOSAVE_DELAY_MS = 1500;

/** Notes listed before "show earlier notes" is offered. */
export const NOTES_HISTORY_LIMIT = 20;

/** How many more notes each press of that button loads. */
export const NOTES_HISTORY_STEP = 20;

export type SaveState = "idle" | "saving" | "saved" | "error";

type UseNotesResult = {
  content: string;
  setContent: (value: string) => void;
  saveState: SaveState;
  /** When the last successful save happened, for the "Saved at ..." hint. */
  savedAt: number | null;
  /** Writes pending text immediately — used on blur, page hide and unmount. */
  flush: () => void;
  /** Every other day's note, newest first. */
  notes: Note[];
  /** True while the edited day's own note is being read. */
  loading: boolean;
  /** True while the history list is still being read. */
  historyLoading: boolean;
  /** True when there are older notes than the ones listed. */
  hasMoreHistory: boolean;
  /** Loads the next page of older notes. */
  loadMoreHistory: () => void;
  /** True when the edited day has a note on the server. */
  noteExists: boolean;
  /** The initial read failed. */
  error: string | null;
  /** Deletes the note being edited and empties the editor. */
  removeCurrentNote: () => Promise<void>;
  /** Deletes an older day's note. */
  removeNote: (noteId: string) => Promise<void>;
  /** Repeats both reads after a failure. */
  reload: () => void;
};

/**
 * The slice of the Firebase `User` this hook needs: an id to key the note.
 * Accepting this shape (and `null`) lets callers pass the context user
 * straight through, without narrowing first.
 */
export type NotesUser = { uid: string } | null | undefined;

/**
 * One note per day, keyed by date.
 *
 * The editor owns the text: it is read once on mount and kept in local state,
 * while writes are debounced. A Firestore subscription is deliberately *not*
 * used here — the snapshot would echo every save back mid-keystroke and fight
 * the user's cursor.
 *
 * **The edited day and its history are two independent reads.** The note itself
 * is fetched by document id (`notes/{date}`), which is one document, so the
 * editor is usable as soon as that single read lands; the history is a separate,
 * bounded query that fills in underneath it. Loading them together — as this
 * hook used to — meant the editor waited on the user's whole journal.
 *
 * `date` comes in as a parameter rather than being read here, because the caller
 * remounts this hook when the selected day changes (`NotesView` keys its inner
 * component by the day). A remount gives the new day a genuinely fresh editor —
 * no state from the previous one survives — while the unmount flush writes any
 * pending keystrokes to the day they were typed on, not to the new one.
 */
export function useNotes(user: NotesUser, date: string): UseNotesResult {
  const uid = user?.uid;

  const [content, setContentState] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [noteExists, setNoteExists] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(NOTES_HISTORY_LIMIT);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Bumping this repeats both reads below.
  const [attempt, setAttempt] = useState(0);

  const latestContentRef = useRef("");
  const lastSavedRef = useRef("");
  const noteExistsRef = useRef(false);
  /** True once the user has typed, so a slow load can't overwrite their text. */
  const editedRef = useRef(false);
  /** Serializes saves so a slow write can never land after a newer one. */
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  /** The edited day's own note — one document, awaited on its own. */
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getNote(uid, date)
      .then((note) => {
        if (cancelled) return;

        // The refs are updated together with the state on purpose: a keystroke
        // landing while this read is in flight must not be overwritten
        // (`editedRef`), and the next save has to know whether the document
        // already exists so it does not restamp `createdAt`.
        noteExistsRef.current = Boolean(note);
        lastSavedRef.current = note?.content ?? "";
        setNoteExists(Boolean(note));
        setSaveState("idle");
        if (!editedRef.current) setContentState(note?.content ?? "");
        setError(null);
        setNoteLoaded(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // A save after a failed read must not assume the note is new: keeping
        // the creation time is the safer mistake than restamping it.
        noteExistsRef.current = true;
        setError(cause instanceof Error ? cause.message : "Unexpected error.");
        setNoteLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, date, attempt]);

  /** The history, in its own bounded read that never blocks the editor. */
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    // One row more than will be listed, so "there is more" is known without
    // asking Firestore to count the collection.
    getRecentNotes(uid, historyLimit + 1)
      .then((recent) => {
        if (cancelled) return;

        const others = previousNotes(recent, date);
        setNotes(others.slice(0, historyLimit));
        setHasMoreHistory(others.length > historyLimit);
        setError(null);
        setHistoryLoaded(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unexpected error.");
        setHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, date, historyLimit, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setNoteLoaded(false);
    setHistoryLoaded(false);
    setAttempt((value) => value + 1);
  }, []);

  const loadMoreHistory = useCallback(() => {
    setHistoryLimit((value) => value + NOTES_HISTORY_STEP);
  }, []);

  /** Writes one revision; resolves to whether it reached Firestore. */
  const persist = useCallback(
    async (value: string): Promise<boolean> => {
      if (!uid) return true;

      try {
        await saveNote(uid, date, value, !noteExistsRef.current);
        // An emptied note is deleted rather than stored, so existence follows
        // the text: the next non-empty save has to stamp `createdAt` again
        // instead of believing the document is still there.
        const exists = !isEmptyNote(value);
        noteExistsRef.current = exists;
        setNoteExists(exists);

        lastSavedRef.current = value;
        setSavedAt(Date.now());
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [uid, date],
  );

  const writeContents = useCallback(
    async (value: string): Promise<boolean> => {
      if (!uid || value === lastSavedRef.current) return true;

      setSaveState("saving");

      const queued = chainRef.current.then(() =>
        value === lastSavedRef.current ? true : persist(value),
      );

      // Keep the chain alive regardless of how this write turned out.
      chainRef.current = queued.then(
        () => undefined,
        () => undefined,
      );

      return queued;
    },
    [uid, persist],
  );

  /** Debounced autosave: every keystroke restarts the timer. */
  useEffect(() => {
    if (!uid || !noteLoaded || content === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      void writeContents(content);
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [uid, noteLoaded, content, writeContents]);

  const flush = useCallback(() => {
    void writeContents(latestContentRef.current);
  }, [writeContents]);

  // A tab closed or reloaded mid-debounce never reaches the effect cleanup
  // below, so the pending text is written on the way out too.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  // Navigating away unmounts this page without any browser event.
  useEffect(() => () => flush(), [flush]);

  const setContent = useCallback((value: string) => {
    editedRef.current = true;
    setContentState(value);
  }, []);

  /**
   * Deletes the note being edited, clearing the editor **first**.
   *
   * The order is what makes this safe: clearing the text and the saved
   * reference is what stops the debounced autosave from writing the note
   * straight back — a pending timer fires into an early return because the text
   * now equals what was last saved. If the delete fails, the editor is put back
   * exactly as it was, so nothing is silently lost either way.
   *
   * Rejects on failure so the confirmation modal can report it.
   */
  const removeCurrentNote = useCallback(async () => {
    if (!uid) return;

    const previous = {
      content: latestContentRef.current,
      saved: lastSavedRef.current,
      exists: noteExistsRef.current,
    };

    editedRef.current = true;
    lastSavedRef.current = "";
    noteExistsRef.current = false;
    setNoteExists(false);
    setContentState("");
    setSavedAt(null);
    setSaveState("idle");

    try {
      await deleteNoteDoc(uid, date);
    } catch (cause) {
      lastSavedRef.current = previous.saved;
      noteExistsRef.current = previous.exists;
      setNoteExists(previous.exists);
      setContentState(previous.content);
      setSaveState("error");
      throw cause;
    }
  }, [uid, date]);

  /**
   * Deletes an older day's note from the history.
   *
   * Rejects on failure so the confirmation modal can report it.
   */
  const removeNote = useCallback(
    async (noteId: string) => {
      if (!uid) return;

      await deleteNoteDoc(uid, noteId);
      setNotes((previous) => previous.filter((note) => note.id !== noteId));
    },
    [uid],
  );

  return {
    content,
    setContent,
    saveState,
    savedAt,
    flush,
    notes,
    loading: Boolean(uid) && !noteLoaded,
    historyLoading: Boolean(uid) && !historyLoaded,
    hasMoreHistory,
    loadMoreHistory,
    noteExists,
    error,
    removeCurrentNote,
    removeNote,
    reload,
  };
}
