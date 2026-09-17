"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import { useAuth } from "@/context/AuthContext";
import { useDay } from "@/context/DayContext";
import { useDayTasks } from "@/hooks/useDayTasks";
import { useGoals } from "@/hooks/useGoals";
import { useModal } from "@/hooks/useModal";
import { formatDayLabel, parseDateKey } from "@/lib/date";
import { captureDraft } from "@/lib/taskSchedule";
import type { TaskFormValues } from "./TaskForm";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import DayProgress from "./DayProgress";
import QuickAddTask from "./QuickAddTask";
import TaskFormModal from "./TaskFormModal";
import TaskList from "./TaskList";
import TodayHeader from "./TodayHeader";
import UnfinishedTasksPanel from "./UnfinishedTasksPanel";

/**
 * How far back the recovery panel looks for unfinished work.
 *
 * A window rather than "all history": the panel has to stay a decision, not an
 * archive, and the day arrows already reach any older day individually.
 */
const HISTORY_DAYS = 14;

/** How long a freshly created task stays marked in the list. */
const HIGHLIGHT_MS = 4000;

export default function TodayView() {
  const t = useTranslations("today");
  const locale = useLocale();
  const { user } = useAuth();
  const { date, isToday } = useDay();
  const {
    tasks,
    unfinished,
    loading,
    error,
    createTask,
    editTask,
    removeTask,
    toggleTaskDone,
    reload,
  } = useDayTasks(user?.uid, date, { historyDays: HISTORY_DAYS });
  // The goals themselves, for the badge on a linked task and for the form's
  // optional goal field. The tasks of a goal are never loaded here — that is
  // the goal page's job, and Today only needs to name the link.
  const { goals, loading: goalsLoading } = useGoals(user?.uid);

  const goalsById = useMemo<Record<string, Goal>>(
    () => Object.fromEntries(goals.map((goal) => [goal.id, goal])),
    [goals],
  );

  const formModal = useModal();
  const deleteModal = useModal();
  const [editingTask, setEditingTask] = useState<LifeTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<LifeTask | null>(null);
  /**
   * What the capture field held when the detailed dialog was opened, so typing a
   * title and then deciding to give it a time does not start over.
   */
  const [draftTitle, setDraftTitle] = useState("");
  /**
   * The task the last write created. A capture field clears itself the instant
   * the write lands, so without this the only evidence of success is a row
   * somewhere below the fold.
   */
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!justCreatedId) return;

    const timer = window.setTimeout(() => setJustCreatedId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [justCreatedId]);

  /** Title only — the whole point of the quick-capture field. */
  const handleQuickAdd = async (title: string) => {
    const id = await createTask(captureDraft(title));
    if (id) setJustCreatedId(id);
  };

  /** The same capture, with the optional fields open from the start. */
  const handleOpenDetails = (title: string) => {
    setEditingTask(null);
    setDraftTitle(title);
    formModal.openModal();
  };

  const handleEdit = (task: LifeTask) => {
    setEditingTask(task);
    formModal.openModal();
  };

  const handleDeleteRequest = (task: LifeTask) => {
    setTaskToDelete(task);
    deleteModal.openModal();
  };

  const handleSubmit = async (values: TaskFormValues) => {
    if (editingTask) {
      // A partial patch: only the fields the form actually carries, so nothing
      // the user did not touch (the day, the completion time) is rewritten.
      await editTask(editingTask.id, values);
    } else {
      const id = await createTask(values);
      if (id) setJustCreatedId(id);
    }
    formModal.closeModal();
  };

  const handleRestore = async () => {
    if (!editingTask) return;
    await editTask(editingTask.id, { dropped: false });
    formModal.closeModal();
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    await removeTask(taskToDelete.id);
    deleteModal.closeModal();
    setTaskToDelete(null);
  };

  return (
    <div>
      <TodayHeader />

      {error && (
        <ErrorBanner
          message={error.kind === "load" ? t("errors.load") : t("errors.save")}
          // Only a failed subscription is worth re-opening; a failed write is
          // re-tried by the action that failed.
          onRetry={error.kind === "load" ? reload : undefined}
        />
      )}

      {/* The one way a task is added: capture first, details only if wanted. */}
      <QuickAddTask
        onCreate={handleQuickAdd}
        onOpenDetails={handleOpenDetails}
        dayLabel={
          isToday ? undefined : formatDayLabel(parseDateKey(date), locale)
        }
      />

      <DayProgress tasks={tasks} />

      <TaskList
        tasks={tasks}
        loading={loading}
        isToday={isToday}
        goalsById={goalsById}
        goalsResolved={!goalsLoading}
        highlightedId={justCreatedId}
        onToggle={toggleTaskDone}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Spoken confirmation of a write the user cannot always see happen. */}
      <p aria-live="polite" className="sr-only">
        {justCreatedId ? t("taskAdded") : ""}
      </p>

      {unfinished.length > 0 && (
        <div className="mt-8">
          <UnfinishedTasksPanel
            groups={unfinished}
            dayKey={date}
            onUpdate={editTask}
          />
        </div>
      )}

      <TaskFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.closeModal}
        task={editingTask}
        defaultTitle={draftTitle}
        goals={goals}
        onSubmit={handleSubmit}
        onRestore={handleRestore}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        namespace="today"
        subjectKey="title"
        subject={taskToDelete?.title ?? null}
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
