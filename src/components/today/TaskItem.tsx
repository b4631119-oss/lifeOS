"use client";

import GoalBadge from "@/components/common/GoalBadge";
import PriorityBadge from "@/components/common/PriorityBadge";
import Badge from "@/components/ui/badge/Badge";
import { CheckLineIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { formatTimeRange } from "@/lib/date";
import { isScheduled } from "@/lib/taskSchedule";
import type { Goal, LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskItemProps {
  task: LifeTask;
  /** The user's goals by id, for the link badge. */
  goalsById: Record<string, Goal>;
  /** True once the goals list has answered at least once. */
  goalsResolved: boolean;
  onToggle: (task: LifeTask) => void;
  onEdit: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

export default function TaskItem({
  task,
  goalsById,
  goalsResolved,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const t = useTranslations("today");
  const locale = useLocale();
  const isDone = task.status === "done";
  const scheduled = isScheduled(task);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={isDone ? t("markTodo") : t("markDone")}
        className={cn(
          // The circle stays 24px, but the tap target is grown to ~44px by a
          // pseudo-element, so finishing a task is not a thumb-precision test.
          "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden",
          "after:absolute after:-inset-2.5 after:rounded-full after:content-['']",
          isDone
            ? "border-success-500 bg-success-500 text-white"
            : "border-gray-300 text-transparent hover:border-brand-500 dark:border-gray-600",
        )}
      >
        <CheckLineIcon className="h-3.5 w-3.5" />
      </button>

      {/* The floor on the title is what keeps the badges from eating it: with
          `min-w-0` a wide goal badge + priority + two buttons can shrink the
          title to a few pixels and wrap it one character per line. */}
      <div className="min-w-[8rem] flex-1">
        <p
          className={cn(
            "text-theme-sm font-medium text-gray-800 dark:text-white/90",
            isDone && "text-gray-400 line-through dark:text-gray-500",
            task.dropped && !isDone && "text-gray-400 dark:text-gray-500",
          )}
        >
          {task.title}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {/* A task without a time says so, rather than inventing one. */}
          {scheduled
            ? formatTimeRange(task.startTime, task.endTime, locale)
            : t("unscheduled")}
        </p>
      </div>

      {/* One wrapping cluster, so a long goal title moves to the next line
          instead of pushing the row wider than the screen. */}
      <div className="flex flex-wrap items-center gap-2">
        <GoalBadge
          goalId={task.goalId}
          goal={task.goalId ? goalsById[task.goalId] : undefined}
          resolved={goalsResolved}
        />
        <PriorityBadge task={task} />
        {task.dropped ? (
          <Badge size="sm" color="light">
            {t("recovery.dropped")}
          </Badge>
        ) : (
          <TaskStatusBadge status={task.status} />
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={t("edit")}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={t("delete")}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
