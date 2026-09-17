"use client";

import type { DailySummary } from "@/lib/analytics";
import { useTranslations } from "next-intl";

interface DailySummaryListProps {
  days: DailySummary[];
}

/**
 * The window, day by day: how much work each day's plan held, how much of it had
 * a time, and how much got done.
 *
 * The columns are the same three the headline counts are built from — `planned`
 * first, not `timed` — so the page and its breakdown cannot end up speaking two
 * different languages. A day with work captured onto it but no hours is a day
 * with a plan, and it reads as one here.
 *
 * Replaces the old completion-rate line chart, which plotted one percentage per
 * day over one or two tasks — a 50% swing behind a single checkbox, drawn as a
 * trend. Counts can be checked against the tasks themselves, which is the whole
 * reason the breakdown exists.
 *
 * Every day of the window is listed, empty ones included. A gap is information
 * (that is what a day off looks like), and a list whose rows appear and
 * disappear is harder to scan than a steady column of figures.
 */
export default function DailySummaryList({ days }: DailySummaryListProps) {
  const t = useTranslations("analytics.daily");

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {days.map((day) => {
        const counts = t("counts", {
          planned: day.planned,
          timed: day.timed,
          done: day.completed,
        });

        return (
          <li
            key={day.date}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            {/* The visible row is two terse fragments; a screen reader gets the
                same figures as a sentence instead of "Mon, 14 Sep 3 2 1". */}
            <span className="sr-only">
              {t("rowAria", {
                label: day.label,
                planned: day.planned,
                timed: day.timed,
                done: day.completed,
              })}
            </span>
            <span
              aria-hidden="true"
              className="truncate text-theme-sm text-gray-700 dark:text-gray-300"
            >
              {day.label}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-theme-xs tabular-nums text-gray-500 dark:text-gray-400"
            >
              {counts}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
