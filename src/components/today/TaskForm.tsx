"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import type { LifeTask, TaskStatus } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type TaskFormValues = {
  title: string;
  startTime: string;
  endTime: string;
  status: TaskStatus;
};

interface TaskFormProps {
  /** Existing task when editing, `null` when creating. */
  task: LifeTask | null;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  /**
   * Pre-fills the time fields when creating a task from a specific slot
   * (e.g. clicking an empty hour on the schedule). Ignored while editing.
   */
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function TaskForm({
  task,
  onSubmit,
  onCancel,
  defaultStartTime = "",
  defaultEndTime = "",
}: TaskFormProps) {
  const t = useTranslations("today");

  const [title, setTitle] = useState(task?.title ?? "");
  const [startTime, setStartTime] = useState(
    task?.startTime ?? defaultStartTime,
  );
  const [endTime, setEndTime] = useState(task?.endTime ?? defaultEndTime);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!title.trim()) return t("validation.titleRequired");
    if (!startTime || !endTime) return t("validation.timeRequired");
    if (endTime <= startTime) return t("validation.timeOrder");
    return null;
  };

  const handleSubmit = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ title: title.trim(), startTime, endTime, status });
    } catch {
      setSubmitError(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: "todo", label: t("statuses.todo") },
    { value: "in_progress", label: t("statuses.in_progress") },
    { value: "done", label: t("statuses.done") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="task-title">{t("taskTitle")}</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("taskTitlePlaceholder")}
          error={Boolean(validationError) && !title.trim()}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="task-start-time">{t("startTime")}</Label>
          <Input
            id="task-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="task-end-time">{t("endTime")}</Label>
          <Input
            id="task-end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>{t("status")}</Label>
        <Select
          options={statusOptions}
          defaultValue={status}
          onChange={(value) => setStatus(value as TaskStatus)}
        />
      </div>

      {validationError && (
        <p className="text-theme-sm text-error-500">{validationError}</p>
      )}
      {submitError && (
        <p className="text-theme-sm text-error-500">{submitError}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {task ? t("update") : t("create")}
        </Button>
      </div>
    </div>
  );
}
