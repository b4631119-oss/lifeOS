"use client";

import {
  deleteNote as deleteNoteDoc,
  getNotes,
  saveNote,
} from "@/lib/firestore";
import { previousNotes } from "@/lib/notes";
import type { Note } from "@/types/lifeos";
import { useCallback, useEffect, useRef, useState } from "react";

/** Idle time after the last keystroke before the note is written. */
export const AUTOSAVE_DELAY_MS = 1500;

export type SaveState = "idle" | "saving" | "saved" | "error";

type UseNotesResult = {
  content: string;
  setContent: (value: string) => void;
  saveState: SaveState;
  /** When the last successful save happened, for the "Saved at ..." hint. */
  savedAt: number | null;
  /** Writes pending text immediately — used on blur, page hide and unmount. */
  flush: () => void;
  /** Every earlier day, newest first. */
  notes: Note[];
  loading: boolean;
  /** The initial read failed. */
  error: string | null;
  removeNote: (noteId: string) => Promise<void>;
  /** Repeats the initial read after it failed. */
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
 * `today` comes in as a parameter rather than being read here, because the
 * caller remounts this hook when the calendar day changes (`NotesView` keys its
 * inner component by the day). A remount gives the new day a genuinely fresh
 * editor — no state from yesterday survives — while the unmount flush writes
 * any pending keystrokes to the day they were typed on, not to the new one.
 */
export function useNotes(user: NotesUser, today: string): UseNotesResult {
  const uid = user?.uid;

  const [content, setContentState] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Bumping this repeats the one-shot read below.
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

  // One-shot read of today's note plus the history.
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getNotes(uid)
      .then((allNotes) => {
        if (cancelled) return;

        const todayNote = allNotes.find((note) => note.date === today);

        noteExistsRef.current = Boolean(todayNote);
        lastSavedRef.current = todayNote?.content ?? "";
        setNotes(previousNotes(allNotes, today));
        if (!editedRef.current) setContentState(todayNote?.content ?? "");
        setError(null);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        noteExistsRef.current = true;
        setError(cause instanceof Error ? cause.message : "Unexpected error.");
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, today, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setLoaded(false);
    setAttempt((value) => value + 1);
  }, []);

  /** Writes one revision; resolves to whether it reached Firestore. */
  const persist = useCallback(
    async (value: string): Promise<boolean> => {
      if (!uid) return true;

      try {
        await saveNote(uid, today, value, !noteExistsRef.current);
        noteExistsRef.current = true;

        lastSavedRef.current = value;
        setSavedAt(Date.now());
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [uid, today],
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
    if (!uid || !loaded || content === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      void writeContents(content);
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [uid, loaded, content, writeContents]);

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

  /** Rejects on failure so the confirmation modal can report it. */
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
    loading: Boolean(uid) && !loaded,
    error,
    removeNote,
    reload,
  };
}
