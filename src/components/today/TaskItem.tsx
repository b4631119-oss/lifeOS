"use client";

import GoalBadge from "@/components/common/GoalBadge";
import PriorityBadge from "@/components/common/PriorityBadge";
import Badge from "@/components/ui/badge/Badge";
import { CheckLineIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { formatTimeRange } from "@/lib/date";
import { isScheduled, type TaskMarker } from "@/lib/taskSchedule";
import type { Goal, LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskItemProps {
  task: LifeTask;
  /** The user's goals by id, for the link badge. */
  goalsById: Record<string, Goal>;
  /** True once the goals list has answered at least once. */
  goalsResolved: boolean;
  /**
   * Whether this task is the one happening now or the next one to start.
   *
   * A reading of the task's own time fields at this minute (see `taskMarkers`),
   * not a second list: the row that is marked is the row the user acts on.
   */
  marker?: TaskMarker;
  /** The task just added to the day, so the write is visibly confirmed. */
  highlighted?: boolean;
  onToggle: (task: LifeTask) => void;
  onEdit: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

export default function TaskItem({
  task,
  goalsById,
  goalsResolved,
  marker,
  highlighted = false,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const t = useTranslations("today");
  const locale = useLocale();
  const isDone = task.status === "done";
  const scheduled = isScheduled(task);

  /**
   * Brings a fresh task into view, but only when it landed below the fold:
   * `nearest` scrolls the smallest distance that makes the row visible, and
   * does nothing at all when it already is.
   */
  const itemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!highlighted) return;
    itemRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <li
      ref={itemRef}
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-brand-300 sm:gap-3 sm:p-4 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40",
        highlighted && "border-brand-400 bg-brand-50/40 dark:border-brand-500/50",
      )}
    >
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
          {/* The clock's two rows are named where their time is read, rather
              than repeated in a card above the list. */}
          {marker && (
            <span
              className={cn(
                "font-semibold tracking-wide uppercase",
                marker === "current"
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-600 dark:text-gray-300",
              )}
            >
              {t(marker)}
            </span>
          )}
          {/* A real space, so the row reads "Now 09:00 – 10:30" aloud too,
              not "Now09:00". */}
          {marker && " "}
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
          className="app-icon-button"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={t("delete")}
          className="app-icon-button hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
