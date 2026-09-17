"use client";

import type { Note } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import NoteHistoryItem from "./NoteHistoryItem";

interface NoteHistoryListProps {
  /** Earlier days, newest first. */
  notes: Note[];
  /** True while this list is being read — the editor above is unaffected. */
  loading: boolean;
  /** True when older notes exist beyond the ones listed. */
  hasMore: boolean;
  onLoadMore: () => void;
  locale: string;
  onOpen: (note: Note) => void;
  onDeleteRequest: (note: Note) => void;
}

export default function NoteHistoryList({
  notes,
  loading,
  hasMore,
  onLoadMore,
  locale,
  onOpen,
  onDeleteRequest,
}: NoteHistoryListProps) {
  const t = useTranslations("notes.history");

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h3>
        {/* The count is only claimed once the read has answered: "0 notes" on
            the way in would be a statement about the user's journal, not about
            a query that has not returned yet. */}
        {!loading && (
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {t("count", { count: notes.length })}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("empty")}
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <NoteHistoryItem
                key={note.id}
                note={note}
                locale={locale}
                onOpen={onOpen}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </ul>

          {/* Only offered while the page is genuinely short of the user's
              history — the query asks for one row more than it lists, so this
              is never a guess. */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={onLoadMore}>
                {t("showMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
