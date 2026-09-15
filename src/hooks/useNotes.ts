"use client";

import { todayKey } from "@/lib/date";
import {
  deleteNote as deleteNoteDoc,
  getNotes,
  saveNote,
  updateNote,
} from "@/lib/firestore";
import { previousNotes } from "@/lib/notes";
import type { Note } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Idle time after the last keystroke before the note is written. */
export const AUTOSAVE_DELAY_MS = 1500;

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Why a summary request failed, so the page can translate it instead of showing
 * the API's English message.
 */
export type SummaryErrorCode = "rateLimit" | "notConfigured" | "generic";

type UseNotesResult = {
  content: string;
  setContent: (value: string) => void;
  saveState: SaveState;
  /** When the last successful save happened, for the "Saved at …" hint. */
  savedAt: number | null;
  /** Writes pending text immediately — used on blur, page hide and unmount. */
  flush: () => void;
  /** Every earlier day, newest first. */
  notes: Note[];
  loading: boolean;
  /**
   * The initial read failed. Save failures are reported by `saveState`
   * instead, so the page banner always means "the note may be incomplete".
   */
  error: string | null;
  summary: string | null;
  summarizing: boolean;
  summaryError: SummaryErrorCode | null;
  requestSummary: () => Promise<void>;
  removeNote: (noteId: string) => Promise<void>;
};

/**
 * One note per day, keyed by date.
 *
 * The editor owns the text: it is read once on mount and kept in local state,
 * while writes are debounced. A Firestore subscription is deliberately *not*
 * used here — the snapshot would echo every save back mid-keystroke and fight
 * the user's cursor. The same reasoning as `useAnalytics`: nothing else writes
 * notes, so there is no second writer to stay in sync with.
 */
export function useNotes(uid: string | undefined): UseNotesResult {
  const today = useMemo(() => todayKey(), []);

  const [content, setContentState] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<SummaryErrorCode | null>(
    null,
  );

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
        setSummary(todayNote?.aiSummary ?? null);
        if (!editedRef.current) setContentState(todayNote?.content ?? "");
        setError(null);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // The note may well exist but be unknown to us now, so assume it does:
        // a merge save is safe either way, while a "create" would not be.
        noteExistsRef.current = true;
        setError(cause instanceof Error ? cause.message : "Unexpected error.");
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, today]);

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
        // The editor's status line reports this; the page level banner is for
        // a failed load, which is the only thing that hides the note entirely.
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

  const requestSummary = useCallback(async () => {
    const text = latestContentRef.current.trim();
    if (!uid || !text || summarizing) return;

    setSummarizing(true);
    setSummaryError(null);

    try {
      // The summary is written onto the same document, so the text has to be
      // saved first — a note that has never been saved has no document yet.
      if (!(await writeContents(latestContentRef.current))) return;

      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) {
        setSummaryError(
          response.status === 429
            ? "rateLimit"
            : response.status === 503
              ? "notConfigured"
              : "generic",
        );
        return;
      }

      const data = await response.json();
      const aiSummary =
        typeof data.summary === "string" ? data.summary.trim() : "";

      if (!aiSummary) {
        setSummaryError("generic");
        return;
      }

      await updateNote(uid, today, { aiSummary });
      setSummary(aiSummary);
    } catch {
      setSummaryError("generic");
    } finally {
      setSummarizing(false);
    }
  }, [uid, today, summarizing, writeContents]);

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
    summary,
    summarizing,
    summaryError,
    requestSummary,
    removeNote,
  };
}
