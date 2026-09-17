"use client";

import {
  formatHistoryDate,
  formatWeekdayShort,
  parseDateKey,
} from "@/lib/date";
import { HISTORY_DAYS } from "@/lib/habits";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";

/**
 * The history strip's state, as the habits page owns it.
 *
 * One window for the whole page rather than a window per habit: the strips then
 * line up, stepping back a week moves every habit at once, and the read behind
 * them stays a single bounded subscription.
 */
export interface HabitHistoryControls {
  dates: string[];
  isCurrent: boolean;
  canGoBack: boolean;
  shift: (delta: number) => void;
  showToday: () => void;
}

interface HabitHistoryStripProps {
  /** Only used to name the cells for assistive technology. */
  habitName: string;
  /** `YYYY-MM-DD`, oldest first. */
  dates: string[];
  doneDates: ReadonlySet<string>;
  today: string;
  /** Whether the strip already ends on today. */
  isCurrent: boolean;
  canGoBack: boolean;
  onToggle: (date: string) => void | Promise<void>;
  /** Steps the strip by whole strips; negative goes back in time. */
  onShift: (delta: number) => void;
  /** Returns to the strip that ends today. */
  onToday: () => void;
}

/**
 * The part of a habit that is actually used on a phone: one row of day cells you
 * can press.
 *
 * The 12 week grid above it stays what it always was — a glance at density — and
 * never pretended to be interactive: its cells are ~12px (a third of a fingertip)
 * and its dates were only reachable through a `title` tooltip, which no touch
 * device shows. Those cells are now marked decorative and this strip carries the
 * interaction: 45×44px targets, a visible day-of-week and day number on each, and
 * a localized accessible name that says which day and what state it is in.
 *
 * Deliberate choices that follow from that:
 *  - The strip *ends* on today, so it can never show a day that has not happened
 *    and there is nothing to disable: every cell in it is markable.
 *  - Today is marked with `aria-current="date"` and a ring, not only with a
 *    colour, so "where am I" survives a colour-blind or screen-reader user.
 *  - Stepping back a week keeps the same seven-day shape; the way home is an
 *    explicit, labelled control rather than a hidden one.
 */
export default function HabitHistoryStrip({
  habitName,
  dates,
  doneDates,
  today,
  isCurrent,
  canGoBack,
  onToggle,
  onShift,
  onToday,
}: HabitHistoryStripProps) {
  const t = useTranslations("habits");
  const locale = useLocale();
  // The label carries the count, so "7" lives in one place (`HISTORY_DAYS`) and
  // the plural rules stay in the dictionary.
  const label = t("historyTitle", { days: HISTORY_DAYS });

  const handleToggle = (date: string) => {
    void Promise.resolve(onToggle(date)).catch(() => {
      // The hook reports the failure on the page, next to the retry button.
    });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="app-label">{label}</p>

        <div className="flex items-center gap-1">
          {!isCurrent && (
            <button
              type="button"
              onClick={onToday}
              className="inline-flex h-11 items-center rounded-lg px-3 text-theme-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              {t("backToToday")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onShift(-1)}
            disabled={!canGoBack}
            aria-label={t("earlierDays")}
            className="app-icon-button disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onShift(1)}
            disabled={isCurrent}
            aria-label={t("laterDays")}
            className="app-icon-button disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        role="group"
        aria-label={label}
        // Full-bleed on a phone: the card's 16px of padding is what stands
        // between seven 44px targets and a 360px viewport, and the padding is
        // cosmetic while the touch target is not. The gaps go too — at 360 they
        // are the difference between 43px cells and 45px ones, and seven bordered
        // cells that touch still read as seven cells.
        className="-mx-4 mt-2 grid grid-cols-7 gap-0 sm:mx-0 sm:gap-1"
      >
        {dates.map((date) => {
          const done = doneDates.has(date);
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              onClick={() => handleToggle(date)}
              aria-pressed={done}
              aria-current={isToday ? "date" : undefined}
              aria-label={t("dayCellAria", {
                name: habitName,
                date: formatHistoryDate(date, locale),
                state: done ? t("legendDone") : t("legendMissed"),
              })}
              className={cn(
                "flex h-11 min-w-0 flex-col items-center justify-center rounded-lg border text-[11px] leading-tight font-medium transition-colors focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden",
                done
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:border-gray-700",
                isToday &&
                  "ring-2 ring-brand-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900",
              )}
            >
              <span className="uppercase">
                {formatWeekdayShort(parseDateKey(date), locale)}
              </span>
              <span>{parseDateKey(date).getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
