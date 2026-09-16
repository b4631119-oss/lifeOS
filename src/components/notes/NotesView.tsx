"use client";

import ComponentCard from "@/components/common/ComponentCard";
import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { useNotes } from "@/hooks/useNotes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { formatDayLabel, formatHistoryDate } from "@/lib/date";
import type { Note } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import NoteEditor from "./NoteEditor";
import NoteHistoryList from "./NoteHistoryList";

/**
 * The notes page, in two parts on purpose.
 *
 * The outer component only observes the calendar day; the inner one owns the
 * editor and is **keyed by that day**. Crossing midnight therefore unmounts
 * yesterday's editor (flushing any pending keystrokes to yesterday's document)
 * and mounts a fresh one for the new day — instead of an editor that has to be
 * told, mid-session, that its document id, its saved text and its history all
 * changed underneath it.
 *
 * `useNotes` → see `src/hooks/useNotes.ts` for the save/serialization rules.
 */
export default function NotesView() {
  const today = useTodayKey();

  return <NotesForDay key={today} today={today} />;
}

function NotesForDay({ today }: { today: string }) {
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
    removeNote,
    reload,
  } = useNotes(user, today);

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
