import assert from "node:assert/strict";
import { test } from "node:test";

import type { Note } from "@/types/lifeos";

import { noteExcerpt, previousNotes, sortNotesNewestFirst } from "./notes.ts";

/** A note as Firestore would hand it back: the id is the date. */
function note(date: string, content = "", aiSummary: string | null = null): Note {
  return { id: date, date, content, aiSummary, createdAt: null };
}

test("sortNotesNewestFirst orders by day, newest first, without mutating the input", () => {
  const notes = [note("2026-09-01"), note("2026-09-15"), note("2025-12-31")];
  const before = notes.map((entry) => entry.date);

  const sorted = sortNotesNewestFirst(notes);

  assert.deepEqual(
    sorted.map((entry) => entry.date),
    ["2026-09-15", "2026-09-01", "2025-12-31"],
  );
  assert.deepEqual(notes.map((entry) => entry.date), before);
});

test("previousNotes drops today's note and keeps the rest newest first", () => {
  const notes = [note("2026-09-13"), note("2026-09-15"), note("2026-09-14")];

  const history = previousNotes(notes, "2026-09-15");

  assert.deepEqual(
    history.map((entry) => entry.date),
    ["2026-09-14", "2026-09-13"],
  );
});

test("previousNotes returns every note when today has none", () => {
  const notes = [note("2026-09-13"), note("2026-09-14")];

  assert.equal(previousNotes(notes, "2026-09-15").length, 2);
});

test("noteExcerpt previews the first line that has text", () => {
  assert.equal(noteExcerpt("  \n\n  Wrote the goals module today\nmore"), "Wrote the goals module today");
  assert.equal(noteExcerpt("Single line"), "Single line");
});

test("noteExcerpt clips a long line and marks it as clipped", () => {
  const excerpt = noteExcerpt("x".repeat(200), 10);

  assert.equal(excerpt, "xxxxxxxxxx…");
});

test("noteExcerpt is empty for an empty or whitespace-only note", () => {
  assert.equal(noteExcerpt(""), "");
  assert.equal(noteExcerpt("   \n\t\n  "), "");
});
