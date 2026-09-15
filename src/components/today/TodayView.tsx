"use client";

import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { useTodayTasks, type TaskDraft } from "@/hooks/useTodayTasks";
import type { LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useState } from "react";
import DayProgress from "./DayProgress";
import DeleteTaskModal from "./DeleteTaskModal";
import TaskFormModal from "./TaskFormModal";
import TaskList from "./TaskList";
import TodayHeader from "./TodayHeader";

export default function TodayView() {
  const t = useTranslations("today");
  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    createTask,
    editTask,
    removeTask,
    toggleTaskDone,
  } = useTodayTasks(user?.uid);

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

  const handleSubmit = async (values: TaskDraft) => {
    if (editingTask) {
      await editTask(editingTask.id, values);
    } else {
      await createTask(values);
    }
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
        <div className="mb-6 rounded-lg border border-error-500/30 bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {t("errors.load")}
        </div>
      )}

      <div className="mb-6">
        <DayProgress tasks={tasks} />
      </div>

      <TaskList
        tasks={tasks}
        loading={loading}
        onToggle={toggleTaskDone}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      <TaskFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.closeModal}
        task={editingTask}
        onSubmit={handleSubmit}
      />

      <DeleteTaskModal
        isOpen={deleteModal.isOpen}
        taskTitle={taskToDelete?.title ?? null}
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
