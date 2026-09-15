"use client";

import type { HabitStreak } from "@/lib/analytics";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface HabitSummaryListProps {
  streaks: HabitStreak[];
}

/**
 * Compact streak overview for the active habits.
 *
 * Intentionally not the 12-week activity grid from /habits — this is the
 * at-a-glance version, so it stays a list rather than duplicating that grid.
 */
export default function HabitSummaryList({ streaks }: HabitSummaryListProps) {
  const t = useTranslations("analytics.habits");

  if (streaks.length === 0) {
    return (
      <p className="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {streaks.map((streak) => (
        <li
          key={streak.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              streak.doneToday ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {streak.name}
            </p>
            {streak.doneToday && (
              <p className="text-theme-xs text-success-600 dark:text-success-400">
                {t("doneToday")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="text-end">
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                {t("current")}
              </p>
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {streak.current}
              </p>
            </div>
            <div className="text-end">
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                {t("best")}
              </p>
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {streak.best}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
