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
