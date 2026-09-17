"use client";

import { Modal } from "@/components/ui/modal";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useId } from "react";
import TaskForm, { type TaskFormValues } from "./TaskForm";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: LifeTask | null;
  /** The user's goals, offered by the form's optional goal field. */
  goals: Goal[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
  /** Pre-fills the time fields when creating a task from a specific slot. */
  defaultStartTime?: string;
  defaultEndTime?: string;
  /**
   * Title the capture field already held, so opening the detailed dialog from
   * it continues that draft instead of asking for the same words twice.
   * Ignored while editing.
   */
  defaultTitle?: string;
  /** Puts a dropped task back on the plan (see `TaskForm`). */
  onRestore?: () => Promise<void>;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  task,
  goals,
  onSubmit,
  defaultStartTime,
  defaultEndTime,
  defaultTitle,
  onRestore,
}: TaskFormModalProps) {
  const t = useTranslations("today");
  const headingId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={headingId}
      className="m-4 max-w-lg p-6 sm:p-8"
    >
      <h3
        id={headingId}
        className="mb-6 text-title-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {task ? t("editTask") : t("newTask")}
      </h3>

      {/*
        Remount per task (and per prefilled slot) so the uncontrolled Select
        and the time inputs pick up the right defaults.
      */}
      <TaskForm
        key={task?.id ?? (defaultStartTime || "new")}
        task={task}
        goals={goals}
        onSubmit={onSubmit}
        onCancel={onClose}
        onRestore={onRestore}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        defaultTitle={defaultTitle}
      />
    </Modal>
  );
}
