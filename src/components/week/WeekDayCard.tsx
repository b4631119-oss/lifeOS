"use client";

import Button from "@/components/ui/button/Button";
import { formatDayLabel, formatShortDay, parseDateKey } from "@/lib/date";
import { tasksInPlan } from "@/lib/taskSchedule";
import { formatWeekday } from "@/lib/week";
import type { Goal, LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import WeekTaskRow from "./WeekTaskRow";

interface WeekDayCardProps {
  /** `YYYY-MM-DD` */
  date: string;
  /** That day's tasks, already in day order. */
  tasks: LifeTask[];
  goalsById: Record<string, Goal>;
  goalsResolved: boolean;
  isToday: boolean;
  selectedIds: string[];
  onToggleSelect: (taskId: string) => void;
  onOpenDay: (date: string) => void;
  onMove: (task: LifeTask) => void;
  onDrop: (task: LifeTask) => void;
  onRestore: (task: LifeTask) => void;
}

/**
 * One day of the week, as a card.
 *
 * Cards rather than a seven-column board: on a phone the day list is the only
 * readable shape, and on a wider screen the same card in a grid still reads
 * top-to-bottom. Nothing is loaded per card — the day's tasks are handed in
 * from the week's single subscription.
 *
 * The card is also the way into the day: "открыть день" selects that date in the
 * shared day context and goes to Today, so the Week view never becomes a second
 * place where a day can be edited.
 */
export default function WeekDayCard({
  date,
  tasks,
  goalsById,
  goalsResolved,
  isToday,
  selectedIds,
  onToggleSelect,
  onOpenDay,
  onMove,
  onDrop,
  onRestore,
}: WeekDayCardProps) {
  const t = useTranslations("week");
  const locale = useLocale();
  const headingId = useId();

  // Dropped tasks are not part of the day's plan, so they do not sit in its
  // count — the same rule the day view and the metrics use.
  const plan = tasksInPlan(tasks);
  const done = plan.filter((task) => task.status === "done").length;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col rounded-2xl border p-4",
        isToday
          ? "border-brand-300 bg-brand-50/30 dark:border-brand-500/40 dark:bg-brand-500/5"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id={headingId}
          className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
        >
          <time dateTime={date} aria-current={isToday ? "date" : undefined}>
            {formatWeekday(date, locale)}
          </time>
        </h3>

        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {formatShortDay(parseDateKey(date), locale)}
          {plan.length > 0 && (
            <>
              {" · "}
              <span>
                {t("tasksDoneOf", { done, total: plan.length })}
              </span>
            </>
          )}
        </p>
      </div>

      {isToday && (
        <p className="mt-1 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
          {t("todayMarker")}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("noTasks")}
        </p>
      ) : (
        <ul className="mt-3 flex-1 space-y-2">
          {tasks.map((task) => (
            <WeekTaskRow
              key={task.id}
              task={task}
              goal={task.goalId ? goalsById[task.goalId] : undefined}
              goalsResolved={goalsResolved}
              selected={selectedIds.includes(task.id)}
              onToggleSelect={onToggleSelect}
              onMove={onMove}
              onDrop={onDrop}
              onRestore={onRestore}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onOpenDay(date)}
          aria-label={t("openDayAria", {
            date: formatDayLabel(parseDateKey(date), locale),
          })}
        >
          {t("openDay")}
        </Button>
      </div>
    </section>
  );
}
