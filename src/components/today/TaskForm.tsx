"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { TimeIcon } from "@/icons";
import { goalStatusOf, isGoalSelectable } from "@/lib/goals";
import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  priorityOf,
  timeRangeError,
} from "@/lib/taskSchedule";
import type { Goal, LifeTask, TaskPriority, TaskStatus } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export type TaskFormValues = {
  title: string;
  /** `"HH:mm"` or `""` — an empty pair means the task is unscheduled. */
  startTime: string;
  endTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** The linked goal, or `undefined` to leave the task without one. */
  goalId?: string;
};

interface TaskFormProps {
  /** Existing task when editing, `null` when creating. */
  task: LifeTask | null;
  /** The user's goals — the selector offers the active ones. */
  goals: Goal[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  /**
   * Offered only while editing a task that was dropped, so taking a task off
   * the plan is never a one-way door.
   */
  onRestore?: () => Promise<void>;
  /**
   * Pre-fills the time fields when creating a task from a specific slot
   * (e.g. clicking an empty hour on the schedule). Ignored while editing.
   */
  defaultStartTime?: string;
  defaultEndTime?: string;
}

/**
 * Capture first, schedule second.
 *
 * The only required field is the title: a task written in a couple of seconds
 * is a valid task, and a time can be added now (or later, from the day list).
 * The time fields stay behind a disclosure so they never stand between the user
 * and the thing they wanted to write down. Priority and the goal link are
 * equally optional — a task that stands on its own is the normal case.
 */
export default function TaskForm({
  task,
  goals,
  onSubmit,
  onCancel,
  onRestore,
  defaultStartTime = "",
  defaultEndTime = "",
}: TaskFormProps) {
  const t = useTranslations("today");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState(task?.title ?? "");
  const [startTime, setStartTime] = useState(
    task?.startTime ?? defaultStartTime,
  );
  const [endTime, setEndTime] = useState(task?.endTime ?? defaultEndTime);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(
    task ? priorityOf(task) : DEFAULT_PRIORITY,
  );
  const [goalId, setGoalId] = useState(task?.goalId ?? "");
  // An existing time (or a slot picked on the Schedule) opens the fields, a
  // plain new task does not.
  const [showTimes, setShowTimes] = useState(
    Boolean(
      task?.startTime || task?.endTime || defaultStartTime || defaultEndTime,
    ),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rangeError = timeRangeError(startTime, endTime);

  /**
   * Only active goals are offered, plus — when editing — whatever this task is
   * already linked to. Opening a task must never silently unlink it just because
   * its goal was completed, archived or deleted since.
   */
  const goalOptions = useMemo(() => {
    const selectable = goals.filter(isGoalSelectable);
    // "No goal" is the select's own empty option (see `placeholder` below),
    // not a second option with the same empty value.
    const options = selectable.map((goal) => ({
      value: goal.id,
      label: goal.title,
    }));

    if (goalId && !selectable.some((goal) => goal.id === goalId)) {
      const current = goals.find((goal) => goal.id === goalId);
      options.push({
        value: goalId,
        label: current
          ? `${current.title} (${tCommon(`goalStatuses.${goalStatusOf(current)}`)})`
          : t("goalMissing"),
      });
    }

    return options;
  }, [goals, goalId, t, tCommon]);

  const handleToggleTimes = () => {
    if (showTimes) {
      // Hiding the fields means "no time for this one". Keeping the values
      // would save a schedule the user can no longer see.
      setStartTime("");
      setEndTime("");
      setValidationError(null);
    }
    setShowTimes((value) => !value);
  };

  const validate = (): string | null => {
    if (!title.trim()) return t("validation.titleRequired");
    if (rangeError === "incomplete") return t("validation.timeIncomplete");
    if (rangeError === "order") return t("validation.timeOrder");
    return null;
  };

  const handleRestore = async () => {
    if (!onRestore) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onRestore();
    } catch {
      setSubmitError(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
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
        title: title.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        status,
        priority,
        // An empty selection means "no goal", which the task layer writes as a
        // removed field rather than an empty one.
        goalId: goalId || undefined,
      });
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

  const priorityOptions = PRIORITIES.map((value) => ({
    value,
    label: tCommon(`priorities.${value}`),
  }));

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="task-title">{t("taskTitle")}</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (validationError && event.target.value.trim()) {
              setValidationError(null);
            }
          }}
          placeholder={t("taskTitlePlaceholder")}
          error={Boolean(validationError) && !title.trim()}
        />
      </div>

      {/* A disclosure, so the fields never stand between the user and the
          title they came here to write. */}
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          startIcon={<TimeIcon />}
          onClick={handleToggleTimes}
          aria-expanded={showTimes}
        >
          {showTimes ? t("timeRemove") : t("timeAdd")}
        </Button>

        {showTimes && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="task-start-time">{t("startTime")}</Label>
                <Input
                  id="task-start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  error={rangeError !== null}
                />
              </div>
              <div>
                <Label htmlFor="task-end-time">{t("endTime")}</Label>
                <Input
                  id="task-end-time"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  error={rangeError !== null}
                />
              </div>
            </div>

            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {t("timeOptionalHint")}
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="task-status">{t("status")}</Label>
          <Select
            id="task-status"
            options={statusOptions}
            defaultValue={status}
            onChange={(value) => setStatus(value as TaskStatus)}
          />
        </div>
        <div>
          <Label htmlFor="task-priority">{t("priority")}</Label>
          <Select
            id="task-priority"
            options={priorityOptions}
            defaultValue={priority}
            onChange={(value) => setPriority(value as TaskPriority)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="task-goal">{t("goal")}</Label>
        <Select
          id="task-goal"
          options={goalOptions}
          defaultValue={goalId}
          onChange={setGoalId}
          placeholder={t("noGoal")}
          placeholderSelectable
        />
        <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("goalHint")}
        </p>
      </div>

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

      <div className="flex flex-wrap items-center justify-end gap-3">
        {task?.dropped && onRestore && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isSubmitting}
          >
            {t("recovery.restore")}
          </Button>
        )}
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
