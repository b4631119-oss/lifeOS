"use client";

import ComponentCard from "@/components/common/ComponentCard";
import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useDay } from "@/context/DayContext";
import { useModal } from "@/hooks/useModal";
import { useNotes } from "@/hooks/useNotes";
import { formatDayLabel, formatHistoryDate, parseDateKey } from "@/lib/date";
import type { Note } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import NoteEditor from "./NoteEditor";
import NoteHistoryList from "./NoteHistoryList";

/**
 * The notes page, in two parts on purpose.
 *
 * The outer component only observes which day is selected; the inner one owns
 * the editor and is **keyed by that day**. Crossing midnight — or opening
 * another day from the history — therefore unmounts the previous editor
 * (flushing any pending keystrokes to the day they were typed on) and mounts a
 * fresh one, instead of an editor that has to be told, mid-session, that its
 * document id, its saved text and its history all changed underneath it.
 *
 * The selected day is the app's shared one (`DayContext`), the same date Today
 * and the Schedule are looking at. That is what makes a past note editable at
 * all: the history is a list of days, and a note is addressed by its day.
 * `useNotes` → see `src/hooks/useNotes.ts` for the read/save rules.
 */
export default function NotesView() {
  const { date } = useDay();

  return <NotesForDay key={date} date={date} />;
}

function NotesForDay({ date }: { date: string }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { user } = useAuth();
  const { isToday, goToDate, goToToday } = useDay();
  const {
    content,
    setContent,
    saveState,
    savedAt,
    flush,
    notes,
    loading,
    historyLoading,
    hasMoreHistory,
    loadMoreHistory,
    noteExists,
    error,
    removeCurrentNote,
    removeNote,
    reload,
  } = useNotes(user, date);

  const deleteModal = useModal();
  /**
   * Which note the confirmation is about: the edited day, or a history row.
   *
   * Only the day is kept — that is all the dialog prints, and all the decision
   * needs. The two deletion paths are then not interchangeable: the edited day
   * has to clear the editor, a history row has to leave the list.
   */
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "current" } | { kind: "history"; noteId: string; day: string } | null
  >(null);

  const dayLabel = formatHistoryDate(date, locale);

  const handleDeleteCurrentRequest = () => {
    setPendingDelete({ kind: "current" });
    deleteModal.openModal();
  };

  const handleDeleteRequest = (note: Note) => {
    setPendingDelete({ kind: "history", noteId: note.id, day: note.date });
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "current") await removeCurrentNote();
    else await removeNote(pendingDelete.noteId);

    deleteModal.closeModal();
    setPendingDelete(null);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <p className="mb-4 hidden text-theme-sm text-gray-500 sm:mb-6 sm:block dark:text-gray-400">
        {isToday ? t("subtitle") : t("subtitleOtherDay")}
      </p>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      <div className="space-y-6">
        {/* The editor renders as soon as its own single document has answered —
            the history below is a separate read and never holds it up. */}
        <ComponentCard
          title={isToday ? t("todayTitle") : t("otherDayTitle")}
          desc={formatDayLabel(parseDateKey(date), locale)}
        >
          {!isToday && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
              <p className="text-theme-xs text-gray-600 dark:text-gray-300">
                {t("editingOtherDay", { date: dayLabel })}
              </p>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t("backToToday")}
              </Button>
            </div>
          )}

          {loading ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("loading")}
            </p>
          ) : (
            <NoteEditor
              value={content}
              onChange={setContent}
              onBlur={flush}
              saveState={saveState}
              savedAt={savedAt}
              locale={locale}
              onDeleteRequest={noteExists ? handleDeleteCurrentRequest : undefined}
            />
          )}
        </ComponentCard>

        <NoteHistoryList
          notes={notes}
          loading={historyLoading}
          hasMore={hasMoreHistory}
          onLoadMore={loadMoreHistory}
          locale={locale}
          onOpen={(note) => goToDate(note.date)}
          onDeleteRequest={handleDeleteRequest}
        />
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        namespace="notes"
        subjectKey="date"
        subject={
          pendingDelete
            ? formatHistoryDate(
                pendingDelete.kind === "current" ? date : pendingDelete.day,
                locale,
              )
            : null
        }
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
