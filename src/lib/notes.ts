import type { Note } from "@/types/lifeos";

/**
 * Pure helpers for the Notes feature.
 *
 * Deliberately free of runtime imports — only types — because the unit tests
 * load this module through Node's native test runner, which cannot resolve the
 * project's `@/*` aliases or extensionless relative imports (see
 * `notes.test.ts` and `completionStamp.ts` for the same pattern).
 *
 * `YYYY-MM-DD` compares chronologically as a string, the same property the
 * Firestore range queries in `lib/firestore.ts` rely on, so none of the dates
 * here need to be parsed.
 */

/**
 * Turning a note document into a `Note`, with the id as the source of truth.
 *
 * A note lives at `users/{uid}/notes/{YYYY-MM-DD}`, so its id already says which
 * day it belongs to. Reading the day from that id — instead of from a `date`
 * field — is what keeps older documents working: a note saved before the field
 * existed has no `date` at all, and used to look like a missing note (the editor
 * came up empty while the text sat in Firestore). Nothing is migrated: the id is
 * simply read for what it is.
 *
 * `content` falls back to `""` for the same reason a mapper defaults anything —
 * a hand-edited or legacy document must not render `undefined` into a textarea.
 *
 * A stored `date` field is accepted and deliberately *not* read, so a document
 * whose field disagrees with its id cannot move the note off its own day; the
 * parameter is spelled out to make that ignore-someone-else's-field decision
 * visible rather than accidental.
 */
export function noteFromDocument(
  id: string,
  data: { content?: unknown; date?: unknown; createdAt?: unknown } | undefined,
): Note {
  const content = data?.content;

  return {
    id,
    date: id,
    content: typeof content === "string" ? content : "",
    createdAt: (data?.createdAt as Note["createdAt"]) ?? null,
  };
}

/**
 * Whether a note's text carries nothing worth storing.
 *
 * Whitespace-only text counts as empty: an editor the user cleared to a newline
 * means "no note", and storing it would leave an "Empty note" row in the
 * history for ever, with no way to remove it. Saving an empty note therefore
 * deletes the document rather than writing `content: ""` (see `saveNote`).
 */
export function isEmptyNote(content: string): boolean {
  return content.trim() === "";
}

/** Newest day first, without mutating the input. */
export function sortNotesNewestFirst(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date));
}

/** Every note except today's, newest first — what the history section lists. */
export function previousNotes(notes: Note[], today: string): Note[] {
  return sortNotesNewestFirst(notes.filter((note) => note.date !== today));
}

/**
 * The first line that has any text, clipped for a collapsed history row.
 *
 * Notes are free-form and may open with blank lines, so the first *non-empty*
 * line is the one worth previewing. Returns `""` for an empty note.
 */
export function noteExcerpt(content: string, maxLength = 120): string {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return "";
  if (firstLine.length <= maxLength) return firstLine;

  return `${firstLine.slice(0, maxLength).trimEnd()}…`;
}
