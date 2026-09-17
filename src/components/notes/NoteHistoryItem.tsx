"use client";

import Button from "@/components/ui/button/Button";
import { TrashBinIcon } from "@/icons";
import { formatHistoryDate } from "@/lib/date";
import { noteExcerpt } from "@/lib/notes";
import type { Note } from "@/types/lifeos";
import { useTranslations } from "next-intl";

interface NoteHistoryItemProps {
  note: Note;
  locale: string;
  /** Opens this day in the editor, so past notes can be rewritten too. */
  onOpen: (note: Note) => void;
  onDeleteRequest: (note: Note) => void;
}

/**
 * One earlier day, as a row that opens it.
 *
 * The row used to only expand in place, which made the history a read-only
 * archive: the text could be looked at but never corrected. A note is the same
 * object whether it was written today or a week ago, so the row now opens that
 * day in the editor above — the one place a note is written.
 *
 * The excerpt is what makes the list scannable without opening anything: the
 * first line that has text, clipped.
 */
export default function NoteHistoryItem({
  note,
  locale,
  onOpen,
  onDeleteRequest,
}: NoteHistoryItemProps) {
  const t = useTranslations("notes.history");

  const dateLabel = formatHistoryDate(note.date, locale);
  const excerpt = noteExcerpt(note.content);

  return (
    <li className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <button
        type="button"
        onClick={() => onOpen(note)}
        aria-label={t("openNote", { date: dateLabel })}
        className="min-w-0 flex-1 rounded-lg text-start focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden"
      >
        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {dateLabel}
        </span>
        <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
          {excerpt || t("noText")}
        </span>
      </button>

      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => onDeleteRequest(note)}
        aria-label={t("deleteNote", { date: dateLabel })}
        className="shrink-0"
      >
        <TrashBinIcon className="h-4 w-4" />
      </Button>
    </li>
  );
}
