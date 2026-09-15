"use client";

import { hourLabel, type TaskSummary } from "@/lib/analytics";
import { useLocale, useTranslations } from "next-intl";

interface AnalyticsStatCardsProps {
  summary: TaskSummary;
  activeHabitCount: number;
}

/** Four headline numbers above the charts. */
export default function AnalyticsStatCards({
  summary,
  activeHabitCount,
}: AnalyticsStatCardsProps) {
  const t = useTranslations("analytics.stats");
  const locale = useLocale();

  const cards = [
    { key: "completionRate", value: `${summary.percent}%` },
    {
      key: "tasksDone",
      value: t("ofTotal", { done: summary.done, total: summary.total }),
    },
    {
      key: "bestHour",
      value:
        summary.peakHour === null
          ? t("noPeak")
          : hourLabel(summary.peakHour, locale),
    },
    { key: "activeHabits", value: String(activeHabitCount) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {t(card.key)}
          </p>
          <p className="mt-1.5 text-theme-xl font-semibold text-gray-800 dark:text-white/90">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
