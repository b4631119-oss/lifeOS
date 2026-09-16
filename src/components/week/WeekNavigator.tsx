"use client";

import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";
import { formatRelativeWeek, formatWeekRange } from "@/lib/week";
import { useLocale, useTranslations } from "next-intl";

interface WeekNavigatorProps {
  /** First day of the week on screen. */
  startKey: string;
  /** Signed distance from the current week, in weeks. */
  offset: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}

/**
 * Previous week / this week / next week, around the week's own dates.
 *
 * The label is built from the calendar (`formatWeekRange`), so it reads
 * "14–20 сентября 2026 г." in Russian and "September 14 – 20, 2026" in English
 * without a single message key; the line under it says where the week sits
 * relative to now, which is what makes the arrows safe to press.
 */
export default function WeekNavigator({
  startKey,
  offset,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
}: WeekNavigatorProps) {
  const t = useTranslations("week");
  const locale = useLocale();

  const arrowClasses =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPreviousWeek}
          aria-label={t("previousWeek")}
          title={t("previousWeek")}
          className={arrowClasses}
        >
          <ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" />
        </button>

        <div className="min-w-0 px-1 text-center">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            <time dateTime={startKey}>{formatWeekRange(startKey, locale)}</time>
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {formatRelativeWeek(offset, locale)}
          </p>
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          aria-label={t("nextWeek")}
          title={t("nextWeek")}
          className={arrowClasses}
        >
          <ChevronLeftIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </button>
      </div>

      {offset !== 0 && (
        <Button variant="outline" size="sm" onClick={onThisWeek}>
          {t("thisWeek")}
        </Button>
      )}
    </div>
  );
}
