"use client";

import GoalBadge from "@/components/common/GoalBadge";
import PriorityBadge from "@/components/common/PriorityBadge";
import TaskStatusBadge from "@/components/today/TaskStatusBadge";
import Badge from "@/components/ui/badge/Badge";
import { CheckLineIcon } from "@/icons";
import { formatTimeRange } from "@/lib/date";
import { isScheduled } from "@/lib/taskSchedule";
import type { Goal, LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";

interface WeekTaskRowProps {
  task: LifeTask;
  /** The goal this task moves forward, when it is linked and still exists. */
  goal?: Goal;
  /** True once the goals list has answered, so a missing link is not guessed. */
  goalsResolved: boolean;
  /** Whether the row is selected for a bulk action. */
  selected: boolean;
  /** The task just added to this day, so the write is visibly confirmed. */
  highlighted?: boolean;
  onToggleSelect: (taskId: string) => void;
  /** Opens the shared reschedule dialog for this task. */
  onMove: (task: LifeTask) => void;
  onDrop: (task: LifeTask) => void;
  /** Puts a dropped task back on the plan. */
  onRestore: (task: LifeTask) => void;
}

/**
 * One task inside a day of the week.
 *
 * Denser than the Today row and thinner than the goal page's: the week is for
 * planning, so what matters is *when* the work sits, how important it is, what
 * it moves forward, and the two decisions a planner actually takes here — move
 * it or take it off the plan. Finishing a task stays in Today, where execution
 * lives.
 *
 * The wording of the task actions is reused from the `today` namespace rather
 * than duplicated: a task is the same object in both views, so "убрать из
 * плана" must not be two different phrases that could drift apart.
 */
export default function WeekTaskRow({
  task,
  goal,
  goalsResolved,
  selected,
  highlighted = false,
  onToggleSelect,
  onMove,
  onDrop,
  onRestore,
}: WeekTaskRowProps) {
  const t = useTranslations("today");
  const tWeek = useTranslations("week");
  const locale = useLocale();

  const isDone = task.status === "done";
  const scheduled = isScheduled(task);

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border bg-white p-3 dark:bg-white/[0.03]",
        selected
          ? "border-brand-400 bg-brand-50/40 dark:border-brand-500/50"
          : "border-gray-200 dark:border-gray-800",
        // A ring rather than the selection's border, so "just added" and
        // "selected for a bulk action" cannot be read as the same state.
        highlighted &&
          "ring-2 ring-brand-400/50 dark:ring-brand-500/50",
      )}
    >
      {/* A real checkbox inside a padded label: the box stays small, the tap
          target does not. */}
      <label className="flex h-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(task.id)}
          aria-label={tWeek("selectTask", { title: task.title })}
          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      {/* Same floor as the Today row: the goal badge, the priority and the two
          action buttons must never squeeze the title into one letter per
          line — they wrap instead. */}
      <div className="min-w-[8rem] flex-1">
        <p
          className={cn(
            "flex items-center gap-1.5 text-theme-sm font-medium text-gray-800 dark:text-white/90",
            isDone && "text-gray-400 line-through dark:text-gray-500",
            task.dropped && !isDone && "text-gray-400 dark:text-gray-500",
          )}
        >
          {/* Done is not colour-only: the check and the strike-through say it
              too, and `aria-hidden` keeps the icon out of the reading order. */}
          {isDone && (
            <CheckLineIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 break-words">{task.title}</span>
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {scheduled
            ? formatTimeRange(task.startTime, task.endTime, locale)
            : t("unscheduled")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GoalBadge
          goalId={task.goalId}
          goal={task.goalId ? goal : undefined}
          resolved={goalsResolved}
        />
        <PriorityBadge task={task} />
        {task.dropped ? (
          <Badge size="sm" color="light">
            {t("recovery.dropped")}
          </Badge>
        ) : (
          // Todo is what a task is unless told otherwise, so it is not badged;
          // the two statuses a planner cares about are.
          task.status !== "todo" && <TaskStatusBadge status={task.status} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onMove(task)}
          aria-label={tWeek("moveTaskAria", { title: task.title })}
          className="inline-flex h-11 items-center rounded-lg px-3 text-theme-xs font-medium text-gray-600 ring-1 ring-gray-300 transition-colors ring-inset hover:bg-gray-50 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5"
        >
          {tWeek("moveTask")}
        </button>
        <button
          type="button"
          onClick={() => (task.dropped ? onRestore(task) : onDrop(task))}
          aria-label={
            task.dropped
              ? tWeek("restoreTaskAria", { title: task.title })
              : tWeek("dropTaskAria", { title: task.title })
          }
          className="inline-flex h-11 items-center rounded-lg px-3 text-theme-xs font-medium text-gray-600 ring-1 ring-gray-300 transition-colors ring-inset hover:bg-gray-50 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5"
        >
          {task.dropped ? t("recovery.restore") : t("recovery.drop")}
        </button>
      </div>
    </li>
  );
}
