"use client";

import { useCallback, useState } from "react";

/**
 * The state behind one capture field, shared by every place a task is written
 * with a title and nothing else.
 *
 * Capture is cheap to describe and easy to get subtly wrong — clearing the text
 * before the write lands loses the user's words, and not guarding the submit
 * creates the task twice — so the rules live here once: a title is the only
 * requirement, the field is emptied *after* a successful write, and a failed one
 * keeps what was typed and reports itself. The wording around it stays with the
 * component, because Today and the Week view say the same thing in their own
 * namespace.
 */
export type CaptureField = {
  value: string;
  setValue: (next: string) => void;
  /** True while the write is in flight; also the double-submit guard. */
  saving: boolean;
  /** True when the last write failed. The text is kept, so nothing is lost. */
  failed: boolean;
  /** True when there is a title to write. */
  ready: boolean;
  /**
   * Writes the current title. Resolves either way — a failure is reported
   * through `failed` rather than thrown, because every caller has to keep the
   * text and show a message rather than handle the exception itself.
   */
  submit: () => Promise<void>;
  /** Empties the field without writing (dismissing the capture). */
  reset: () => void;
};

export function useCaptureField(
  onCreate: (title: string) => Promise<unknown>,
): CaptureField {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const trimmed = value.trim();

  const submit = useCallback(async () => {
    // Guards a double submit (Enter held down, or a double click) — the write
    // must not create the task twice.
    if (!trimmed || saving) return;

    setSaving(true);
    setFailed(false);

    try {
      await onCreate(trimmed);
      // Cleared only after the write lands, so a failure never eats the text.
      setValue("");
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }, [onCreate, saving, trimmed]);

  const reset = useCallback(() => {
    setValue("");
    setFailed(false);
  }, []);

  return {
    value,
    setValue,
    saving,
    failed,
    ready: trimmed.length > 0,
    submit,
    reset,
  };
}
