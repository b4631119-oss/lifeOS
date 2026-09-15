"use client";

import ComponentCard from "@/components/common/ComponentCard";
import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { useNotes } from "@/hooks/useNotes";
import { formatDayLabel, formatHistoryDate } from "@/lib/date";
import type { Note } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import NoteEditor from "./NoteEditor";
import NoteHistoryList from "./NoteHistoryList";
import NoteSummaryCard from "./NoteSummaryCard";

export default function NotesView() {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { user } = useAuth();
  const {
    content,
    setContent,
    saveState,
    savedAt,
    flush,
    notes,
    loading,
    error,
    summary,
    summarizing,
    summaryError,
    requestSummary,
    removeNote,
    reload,
  } = useNotes(user);

  const deleteModal = useModal();
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const handleDeleteRequest = (note: Note) => {
    setNoteToDelete(note);
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    await removeNote(noteToDelete.id);
    deleteModal.closeModal();
    setNoteToDelete(null);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("title")} />

      <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
        {t("subtitle")}
      </p>

      {error && <ErrorBanner message={t("errors.load")} onRetry={reload} />}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ComponentCard
            title={t("todayTitle")}
            desc={formatDayLabel(new Date(), locale)}
          >
            <NoteEditor
              value={content}
              onChange={setContent}
              onBlur={flush}
              saveState={saveState}
              savedAt={savedAt}
              locale={locale}
              summarizing={summarizing}
              onSummarize={requestSummary}
            />

            <NoteSummaryCard
              summary={summary}
              summarizing={summarizing}
              error={summaryError}
              onRetry={requestSummary}
            />
          </ComponentCard>

          <NoteHistoryList
            notes={notes}
            locale={locale}
            onDeleteRequest={handleDeleteRequest}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        namespace="notes"
        subjectKey="date"
        subject={
          noteToDelete ? formatHistoryDate(noteToDelete.date, locale) : null
        }
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
