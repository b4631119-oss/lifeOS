"use client";

import PriorityBadge from "@/components/common/PriorityBadge";
import { CheckLineIcon, TrashBinIcon } from "@/icons";
import { formatRelativeDay, formatTimeRange } from "@/lib/date";
import { isScheduled } from "@/lib/taskSchedule";
import type { LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";

interface GoalTaskRowProps {
  task: LifeTask;
  /** Today, so the day is shown as \"today\" / \"yesterday\" where that helps. */
  today: string;
  onToggle: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

/**
 * One linked task inside a goal page.
 *
 * Deliberately smaller than the Today row: the goal is already the subject of
 * the page, so the badge linking back to it would be a circle, and what matters
 * here is *when* the work sits and whether it is done.
 */
export default function GoalTaskRow({
  task,
  today,
  onToggle,
  onDelete,
}: GoalTaskRowProps) {
  const t = useTranslations("goals");
  const locale = useLocale();
  const isDone = task.status === "done";

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={isDone ? t("markTaskTodo") : t("markTaskDone")}
        className={cn(
          // Same as the Today row: a 24px circle with a ~44px tap target.
          "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden",
          "after:absolute after:-inset-2.5 after:rounded-full after:content-['']",
          isDone
            ? "border-success-500 bg-success-500 text-white"
            : "border-gray-300 text-transparent hover:border-brand-500 dark:border-gray-600",
        )}
      >
        <CheckLineIcon className="h-3.5 w-3.5" />
      </button>

      {/* Same floor as the Today row: the badge and the buttons wrap rather
          than squeezing the title to one letter per line. */}
      <div className="min-w-[8rem] flex-1">
        <p
          className={cn(
            "text-theme-sm font-medium text-gray-800 dark:text-white/90",
            isDone && "text-gray-400 line-through dark:text-gray-500",
          )}
        >
          {task.title}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {formatRelativeDay(task.date, today, locale)}
          {" · "}
          {/* An untimed task says so rather than borrowing a time it never had. */}
          {isScheduled(task)
            ? formatTimeRange(task.startTime, task.endTime, locale)
            : t("noTimeSet")}
        </p>
      </div>

      <PriorityBadge task={task} />

      <button
        type="button"
        onClick={() => onDelete(task)}
        aria-label={t("deleteTask")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:hover:bg-error-500/10"
      >
        <TrashBinIcon className="h-4 w-4" />
      </button>
    </li>
  );
}
