"use client";

import { ChevronDownIcon, TrashBinIcon } from "@/icons";
import { formatHistoryDate } from "@/lib/date";
import { noteExcerpt } from "@/lib/notes";
import type { Note } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface NoteHistoryItemProps {
  note: Note;
  locale: string;
  onDeleteRequest: (note: Note) => void;
}

export default function NoteHistoryItem({
  note,
  locale,
  onDeleteRequest,
}: NoteHistoryItemProps) {
  const t = useTranslations("notes.history");
  const [isOpen, setIsOpen] = useState(false);

  const dateLabel = formatHistoryDate(note.date, locale);

  return (
    <li className="rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
          <span className="min-w-0">
            <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {dateLabel}
            </span>
            {/* The body is only rendered once expanded — a month of notes is
                a lot of text to keep in the DOM. */}
            {!isOpen && (
              <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {noteExcerpt(note.content) || t("noText")}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDeleteRequest(note)}
          aria-label={t("deleteNote", { date: dateLabel })}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:text-error-500"
        >
          <TrashBinIcon className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-theme-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {note.content}
          </p>

          {note.aiSummary && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]">
              <p className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {t("summaryLabel")}
              </p>
              <p className="mt-1.5 text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {note.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
