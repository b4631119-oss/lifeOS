"use client";

import GoalBadge from "@/components/common/GoalBadge";
import PriorityBadge from "@/components/common/PriorityBadge";
import { formatTimeRange, toMinutes } from "@/lib/date";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";

interface ScheduleAgendaProps {
  /** The day's tasks that have a time, in day order. */
  tasks: LifeTask[];
  goalsById: Record<string, Goal>;
  goalsResolved: boolean;
  onEdit: (task: LifeTask) => void;
}

/**
 * The day's schedule on a phone, as a list instead of a timeline.
 *
 * An hour-by-hour grid with absolute blocks needs height and width that a phone
 * does not have: at 360px the day became a long column of narrow blocks, and the
 * signature interaction (dragging a block to another hour) is a pointer gesture
 * that does not survive a thumb on a small target. So the same tasks are shown
 * as an agenda — time, what it is, which goal it moves — ordered by start, and
 * each row opens the task dialog where the time can be changed precisely.
 *
 * The timeline itself is unchanged from `md` upwards, where there is room for it.
 */
export default function ScheduleAgenda({
  tasks,
  goalsById,
  goalsResolved,
  onEdit,
}: ScheduleAgendaProps) {
  const t = useTranslations("schedule");
  const locale = useLocale();

  const ordered = [...tasks].sort(
    (a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0),
  );

  if (ordered.length === 0) return null;

  return (
    <section aria-label={t("title")} className="md:hidden">
      <ol className="space-y-2">
        {ordered.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="app-card flex w-full items-start gap-3 p-3.5 text-start transition-colors hover:border-brand-300 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:hover:border-brand-500/40"
            >
              {/* The time is the anchor of the list, so it gets a fixed gutter
                  the eye can run down instead of a wrapping label. */}
              <span className="w-14 shrink-0 pt-0.5 text-theme-xs font-medium text-gray-500 tabular-nums dark:text-gray-400">
                {formatTimeRange(task.startTime, task.endTime, locale)}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={
                    task.status === "done"
                      ? "block text-theme-sm font-medium text-gray-400 line-through dark:text-gray-500"
                      : "block text-theme-sm font-medium text-gray-800 dark:text-white/90"
                  }
                >
                  {task.title}
                </span>

                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  <GoalBadge
                    goalId={task.goalId}
                    goal={task.goalId ? goalsById[task.goalId] : undefined}
                    resolved={goalsResolved}
                  />
                  <PriorityBadge task={task} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
