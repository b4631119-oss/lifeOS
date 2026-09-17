import assert from "node:assert/strict";
import { test } from "node:test";

import type { Note } from "@/types/lifeos";

import {
  isEmptyNote,
  noteExcerpt,
  noteFromDocument,
  previousNotes,
  sortNotesNewestFirst,
} from "./notes.ts";

/** A note as Firestore would hand it back: the id is the date. */
function note(date: string, content = ""): Note {
  return { id: date, date, content, createdAt: null };
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

/* ------------------------- reading a note by its document ------------------- */

test("a note takes its date from the document id", () => {
  const note = noteFromDocument("2026-09-17", { content: "A few lines" });

  assert.equal(note.id, "2026-09-17");
  assert.equal(note.date, "2026-09-17");
  assert.equal(note.content, "A few lines");
});

test("a legacy note with no date field still belongs to its own day", () => {
  // The bug this replaced: the note was looked up by matching a `date` field, so
  // a document written before that field existed was never found — the editor
  // came up empty while the text was still in Firestore. The id is always there.
  const note = noteFromDocument("2026-09-16", { content: "Older text" });

  assert.equal(note.date, "2026-09-16");
  assert.equal(note.content, "Older text");

  // Even a `date` field that disagrees cannot move the note off its own id.
  const conflicting = noteFromDocument("2026-09-16", {
    date: "2026-01-01",
    content: "x",
  });
  assert.equal(conflicting.date, "2026-09-16");
});

test("a missing or malformed document maps to an empty note, never undefined", () => {
  assert.deepEqual(noteFromDocument("2026-09-17", undefined), {
    id: "2026-09-17",
    date: "2026-09-17",
    content: "",
    createdAt: null,
  });

  const wrongType = noteFromDocument("2026-09-17", { content: 42 });
  assert.equal(wrongType.content, "");
});

/* ------------------------------ empty vs. absent ---------------------------- */

test("whitespace-only text counts as an empty note", () => {
  assert.equal(isEmptyNote(""), true);
  assert.equal(isEmptyNote("   "), true);
  assert.equal(isEmptyNote("\n\t\n"), true);

  assert.equal(isEmptyNote("x"), false);
  assert.equal(isEmptyNote("  x  "), false);
  assert.equal(isEmptyNote("0"), false);
});
