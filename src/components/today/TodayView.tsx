"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import ErrorBanner from "@/components/common/ErrorBanner";
import { useAuth } from "@/context/AuthContext";
import { useDay } from "@/context/DayContext";
import { useDayTasks } from "@/hooks/useDayTasks";
import { useGoals } from "@/hooks/useGoals";
import { useModal } from "@/hooks/useModal";
import type { TaskFormValues } from "./TaskForm";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import CurrentNextStrip from "./CurrentNextStrip";
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

export default function TodayView() {
  const t = useTranslations("today");
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

  const handleCreate = () => {
    setEditingTask(null);
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

  /** Title only — the whole point of the quick-capture field. */
  const handleQuickAdd = (title: string) =>
    createTask({
      title,
      startTime: "",
      endTime: "",
      status: "todo",
      // No goal, medium priority: the two decisions the field exists to avoid.
      priority: "medium",
    });

  const handleSubmit = async (values: TaskFormValues) => {
    if (editingTask) {
      // A partial patch: only the fields the form actually carries, so nothing
      // the user did not touch (the day, the completion time) is rewritten.
      await editTask(editingTask.id, values);
    } else {
      await createTask(values);
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
      <TodayHeader onAddTask={handleCreate} />

      {error && (
        <ErrorBanner
          message={error.kind === "load" ? t("errors.load") : t("errors.save")}
          // Only a failed subscription is worth re-opening; a failed write is
          // re-tried by the action that failed.
          onRetry={error.kind === "load" ? reload : undefined}
        />
      )}

      <QuickAddTask onCreate={handleQuickAdd} />

      <CurrentNextStrip tasks={tasks} isToday={isToday} />

      <div className="mb-6">
        <DayProgress tasks={tasks} />
      </div>

      {unfinished.length > 0 && (
        <UnfinishedTasksPanel
          groups={unfinished}
          dayKey={date}
          onUpdate={editTask}
        />
      )}

      <TaskList
        tasks={tasks}
        loading={loading}
        isToday={isToday}
        goalsById={goalsById}
        goalsResolved={!goalsLoading}
        onToggle={toggleTaskDone}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      <TaskFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.closeModal}
        task={editingTask}
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
