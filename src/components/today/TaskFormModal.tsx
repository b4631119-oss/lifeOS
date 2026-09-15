"use client";

import { Modal } from "@/components/ui/modal";
import type { LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import TaskForm, { type TaskFormValues } from "./TaskForm";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: LifeTask | null;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  /** Pre-fills the time fields when creating a task from a specific slot. */
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  task,
  onSubmit,
  defaultStartTime,
  defaultEndTime,
}: TaskFormModalProps) {
  const t = useTranslations("today");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg p-6 sm:p-8">
      <h3 className="mb-6 text-title-sm font-semibold text-gray-800 dark:text-white/90">
        {task ? t("editTask") : t("newTask")}
      </h3>

      {/*
        Remount per task (and per prefilled slot) so the uncontrolled Select
        and the time inputs pick up the right defaults.
      */}
      <TaskForm
        key={task?.id ?? (defaultStartTime || "new")}
        task={task}
        onSubmit={onSubmit}
        onCancel={onClose}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
    </Modal>
  );
}
