"use client";

import ConfirmModal from "@/components/common/ConfirmModal";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import QuickAddTask from "@/components/today/QuickAddTask";
import { Link } from "@/i18n/navigation";
import { formatTimeRange } from "@/lib/date";
import {
  goalProgressOf,
  goalStatusOf,
  legacyOpenSubtasks,
  nextActionFor,
  splitGoalTasks,
} from "@/lib/goals";
import { isScheduled } from "@/lib/taskSchedule";
import type { Goal, GoalStatus, LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import GoalTaskRow from "./GoalTaskRow";

const STATUS_COLORS: Record<GoalStatus, "primary" | "success" | "light"> = {
  active: "primary",
  completed: "success",
  archived: "light",
};

interface GoalDetailProps {
  goal: Goal;
  /** The tasks linked to this goal, real time. */
  tasks: LifeTask[];
  /** True while the linked tasks are still being read. */
  loading: boolean;
  /** A failed read or write, already turned into a message key by the caller. */
  actionError: boolean;
  today: string;
  onSetStatus: (status: GoalStatus) => Promise<void>;
  onToggleTask: (task: LifeTask) => Promise<void>;
  onRemoveTask: (taskId: string) => Promise<void>;
  /** Adds a real task for today, linked to this goal. */
  onCreateTask: (title: string) => Promise<void>;
  /** Moves the goal's remaining pre-task steps into tasks; returns how many. */
  onMoveSubtasks: () => Promise<number>;
}

/**
 * The goal page's body, as a pure function of the goal and its tasks.
 *
 * Everything it shows is derived from the tasks passed in — there is no stored
 * progress to read — and it takes its writes as callbacks, so the page can be
 * rendered (and reviewed) without a database behind it. It answers one question:
 * *what concrete work is moving this goal forward?*
 */
export default function GoalDetail({
  goal,
  tasks,
  loading,
  actionError,
  today,
  onSetStatus,
  onToggleTask,
  onRemoveTask,
  onCreateTask,
  onMoveSubtasks,
}: GoalDetailProps) {
  const t = useTranslations("goals");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [taskToDelete, setTaskToDelete] = useState<LifeTask | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [movedCount, setMovedCount] = useState<number | null>(null);

  const status = goalStatusOf(goal);
  const progress = goalProgressOf(tasks);
  const nextAction = nextActionFor(tasks, today);
  const { open, completed } = splitGoalTasks(tasks, today);
  const legacyOpen = legacyOpenSubtasks(goal);

  const handleDeleteRequest = (task: LifeTask) => {
    setTaskToDelete(task);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    await onRemoveTask(taskToDelete.id);
    setConfirmOpen(false);
    setTaskToDelete(null);
  };

  const handleMoveSteps = async () => {
    try {
      setMovedCount(await onMoveSubtasks());
    } catch {
      // The caller already recorded the failure and shows it above; nothing was
      // moved, because the conversion is one atomic batch.
      setMovedCount(null);
    }
  };

  const statusActions = (
    <>
      {status === "active" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSetStatus("completed")}
          >
            {t("markComplete")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSetStatus("archived")}
          >
            {t("archive")}
          </Button>
        </>
      )}
      {status === "completed" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSetStatus("active")}
          >
            {t("reopen")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSetStatus("archived")}
          >
            {t("archive")}
          </Button>
        </>
      )}
      {status === "archived" && (
        <Button size="sm" variant="outline" onClick={() => onSetStatus("active")}>
          {t("restore")}
        </Button>
      )}
    </>
  );

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm" color={STATUS_COLORS[status]}>
                {tCommon(`goalStatuses.${status}`)}
              </Badge>
              {goal.deadline && (
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("deadlineLabel")} {goal.deadline}
                </span>
              )}
            </div>
            {goal.description && (
              <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
                {goal.description}
              </p>
            )}
            <Link
              href="/goals"
              className="mt-3 inline-block text-theme-xs font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
            >
              {t("backToList")}
            </Link>
          </div>

          {/* The goal's own lifecycle. Changing it never touches the tasks
              linked to it, so archiving a direction cannot erase a day of work. */}
          <div className="flex flex-wrap items-center gap-2">{statusActions}</div>
        </div>

        {actionError && (
          <p className="mt-3 text-theme-sm text-error-500" role="alert">
            {t("errors.save")}
          </p>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {t("taskProgress")}
        </h2>

        {loading ? (
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        ) : progress.total === 0 ? (
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("noLinkedTasksHint")}
          </p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {progress.done} / {progress.total}
            </p>
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              aria-valuetext={t("tasksCompleted", {
                done: progress.done,
                total: progress.total,
              })}
            >
              <div
                className="h-full rounded-full bg-success-500 transition-all duration-500"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("tasksCompleted", {
                done: progress.done,
                total: progress.total,
              })}
              {progress.dropped > 0 &&
                ` · ${t("droppedCount", { count: progress.dropped })}`}
            </p>
          </>
        )}

        {nextAction && (
          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.03]">
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              {t("nextAction")}
            </p>
            <p className="mt-0.5 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {nextAction.title}
            </p>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              {isScheduled(nextAction)
                ? formatTimeRange(nextAction.startTime, nextAction.endTime, locale)
                : t("noTimeSet")}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {t("addTask")}
        </h2>
        {/* The same capture-first field as Today: turning a goal into work must
            not be a form the user has to think about. */}
        <QuickAddTask onCreate={onCreateTask} />
      </section>

      <section className="mt-2">
        <h2 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {t("openTasks")}
        </h2>

        {open.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("noOpenTasks")}
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((task) => (
              <GoalTaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={onToggleTask}
                onDelete={handleDeleteRequest}
              />
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {t("completedTasks")}
          </h2>
          <ul className="space-y-3">
            {completed.map((task) => (
              <GoalTaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={onToggleTask}
                onDelete={handleDeleteRequest}
              />
            ))}
          </ul>
        </section>
      )}

      {goal.subtasks.length > 0 && (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-white/[0.02]">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {t("legacyTitle")}
          </h2>
          <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("legacyNote", {
              open: legacyOpen.length,
              done: goal.subtasks.length - legacyOpen.length,
            })}
          </p>

          {legacyOpen.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={handleMoveSteps}
            >
              {t("legacyMove")}
            </Button>
          ) : (
            <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("legacyNoOpen")}
            </p>
          )}

          {movedCount !== null && movedCount > 0 && (
            <p className="mt-3 text-theme-xs text-success-600 dark:text-success-400">
              {t("legacyMoved", { count: movedCount })}
            </p>
          )}
        </section>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        namespace="today"
        subjectKey="title"
        subject={taskToDelete?.title ?? null}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
