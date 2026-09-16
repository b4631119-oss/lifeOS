"use client";

import Button from "@/components/ui/button/Button";
import { useDay } from "@/context/DayContext";
import { ChevronLeftIcon } from "@/icons";
import { formatDayLabel, formatRelativeDay, parseDateKey } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";

interface DayNavigatorProps {
  /**
   * Line under the date. Defaults to a relative day label ("yesterday",
   * "in 3 days"), which is what tells the user where they have landed.
   */
  subtitle?: string;
}

/**
 * Previous day / today / next day.
 *
 * Shared by Today and Schedule so both are always on the same date. The arrows
 * are real buttons on the shared day context — the date itself is arbitrary,
 * "yesterday" and "tomorrow" are just the first two steps.
 */
export default function DayNavigator({ subtitle }: DayNavigatorProps) {
  const t = useTranslations("dayNav");
  const locale = useLocale();
  const { date, today, isToday, goToPreviousDay, goToNextDay, goToToday } =
    useDay();

  const arrowClasses =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goToPreviousDay}
          aria-label={t("previousDay")}
          title={t("previousDay")}
          className={arrowClasses}
        >
          <ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" />
        </button>

        <div className="min-w-0 px-1 text-center">
          <p
            className="text-theme-sm font-medium text-gray-800 dark:text-white/90"
            suppressHydrationWarning
          >
            <time dateTime={date}>
              {formatDayLabel(parseDateKey(date), locale)}
            </time>
          </p>
          <p
            className="text-theme-xs text-gray-500 dark:text-gray-400"
            suppressHydrationWarning
          >
            {subtitle ?? formatRelativeDay(date, today, locale)}
          </p>
        </div>

        <button
          type="button"
          onClick={goToNextDay}
          aria-label={t("nextDay")}
          title={t("nextDay")}
          className={arrowClasses}
        >
          <ChevronLeftIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </button>
      </div>

      {!isToday && (
        <Button variant="outline" size="sm" onClick={goToToday}>
          {t("backToToday")}
        </Button>
      )}
    </div>
  );
}
