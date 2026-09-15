"use client";

import type { Note } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import NoteHistoryItem from "./NoteHistoryItem";

interface NoteHistoryListProps {
  /** Earlier days, newest first. */
  notes: Note[];
  locale: string;
  onDeleteRequest: (note: Note) => void;
}

export default function NoteHistoryList({
  notes,
  locale,
  onDeleteRequest,
}: NoteHistoryListProps) {
  const t = useTranslations("notes.history");

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h3>
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("count", { count: notes.length })}
        </span>
      </div>

      {notes.length === 0 ? (
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <NoteHistoryItem
              key={note.id}
              note={note}
              locale={locale}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
