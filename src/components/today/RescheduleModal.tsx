"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { isValidDateKey } from "@/lib/date";
import { timeRangeError } from "@/lib/taskSchedule";
import type { LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export type RescheduleValues = {
  /** New `YYYY-MM-DD`. */
  date: string;
  /** `"HH:mm"` or `""` — empty keeps the task unscheduled. */
  startTime: string;
  endTime: string;
};

interface RescheduleModalProps {
  isOpen: boolean;
  /** The task being moved; `null` while the dialog is closed. */
  task: LifeTask | null;
  /** The day on screen — what the date field starts on. */
  defaultDate: string;
  onClose: () => void;
  /** Rejects on failure, which keeps the dialog open with an error. */
  onSubmit: (values: RescheduleValues) => Promise<void>;
}

/**
 * Gives an unfinished task a new day (and, if wanted, a new time).
 *
 * Moving is a single write of `date`/`startTime`/`endTime` on the existing
 * document — the task is never deleted and recreated, so its history and its
 * completion time survive the move.
 */
export default function RescheduleModal({
  isOpen,
  task,
  defaultDate,
  onClose,
  onSubmit,
}: RescheduleModalProps) {
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
        className="text-title-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("recovery.rescheduleTitle")}
      </h3>
      {task && (
        <p className="mt-2 truncate text-theme-sm text-gray-500 dark:text-gray-400">
          {task.title}
        </p>
      )}

      <div className="mt-6">
        {/* Remounted per task so the fields start from that task's values. */}
        <RescheduleForm
          key={task?.id}
          task={task}
          defaultDate={defaultDate}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}

interface RescheduleFormProps {
  task: LifeTask | null;
  defaultDate: string;
  onSubmit: (values: RescheduleValues) => Promise<void>;
  onCancel: () => void;
}

function RescheduleForm({
  task,
  defaultDate,
  onSubmit,
  onCancel,
}: RescheduleFormProps) {
  const t = useTranslations("today");

  const [date, setDate] = useState(task?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(task?.startTime ?? "");
  const [endTime, setEndTime] = useState(task?.endTime ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!isValidDateKey(date)) return t("recovery.rescheduleDateRequired");

    const range = timeRangeError(startTime, endTime);
    if (range === "incomplete") return t("validation.timeIncomplete");
    if (range === "order") return t("validation.timeOrder");

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
      await onSubmit({
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      });
    } catch {
      setSubmitError(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="reschedule-date">{t("recovery.rescheduleDate")}</Label>
        <Input
          id="reschedule-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={Boolean(validationError) && !isValidDateKey(date)}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">
          {t("timeOptionalLabel")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="reschedule-start-time">{t("startTime")}</Label>
            <Input
              id="reschedule-start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reschedule-end-time">{t("endTime")}</Label>
            <Input
              id="reschedule-end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {validationError && (
        <p className="text-theme-sm text-error-500" role="alert">
          {validationError}
        </p>
      )}
      {submitError && (
        <p className="text-theme-sm text-error-500" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {t("recovery.rescheduleSubmit")}
        </Button>
      </div>
    </div>
  );
}
