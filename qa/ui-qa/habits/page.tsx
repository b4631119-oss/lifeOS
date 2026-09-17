"use client";

/**
 * TEMPORARY QA screen (see `../page.tsx`).
 *
 * The habits list with fixtures, inside the real shell and at the document
 * level, so an iframe of a given width gives it a real viewport: the point of
 * this screen is to press the day cells at 360px, and to measure that seven of
 * them really are ≥44px wide with no sideways scroll.
 *
 * The toggles are wired to local state instead of Firestore, so a click on a
 * *past* day visibly flips that day and only that day — the interaction the
 * product was missing.
 */
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import HabitForm from "@/components/habits/HabitForm";
import HabitList from "@/components/habits/HabitList";
import type { HabitHistoryControls } from "@/components/habits/HabitHistoryStrip";
import {
  clampHistoryOffset,
  GRID_WEEKS,
  historyDays,
  MIN_HISTORY_OFFSET,
} from "@/lib/habits";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import Shell from "../Shell";
import { DONE_DATES, GRID_DATES, HABIT, TODAY } from "../fixtures";

export default function UiQaHabitsPage() {
  const t = useTranslations("habits");
  const [doneDates, setDoneDates] = useState<Set<string>>(
    () => new Set(DONE_DATES),
  );
  const [offset, setOffset] = useState(0);

  const history: HabitHistoryControls = useMemo(
    () => ({
      dates: historyDays(TODAY, offset),
      isCurrent: offset === 0,
      canGoBack: offset > MIN_HISTORY_OFFSET,
      shift: (delta: number) =>
        setOffset((previous) => clampHistoryOffset(previous + delta)),
      showToday: () => setOffset(0),
    }),
    [offset],
  );

  // The same rule the hook applies: one mark per day, flipped by a second press.
  const toggleDate = useCallback(async (_habitId: string, date: string) => {
    setDoneDates((previous) => {
      const next = new Set(previous);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  return (
    <Shell>
      <PageBreadcrumb pageTitle={t("title")} />

      <p className="mb-4 hidden text-theme-sm text-gray-500 sm:mb-6 sm:block dark:text-gray-400">
        {t("subtitle")}
      </p>

      <div className="mb-6">
        <HabitForm onSubmit={async () => undefined} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("activityTitle", { weeks: GRID_WEEKS })}
        </span>
        <span className="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
          <span className="h-3.5 w-3.5 rounded-[3px] bg-gray-200 sm:h-3 sm:w-3 dark:bg-gray-800" />
          {t("legendMissed")}
          <span className="h-3.5 w-3.5 rounded-[3px] bg-brand-500 sm:h-3 sm:w-3" />
          {t("legendDone")}
        </span>
      </div>

      <HabitList
        habits={[HABIT, { ...HABIT, id: "h2", name: "Читать перед сном" }]}
        doneDatesByHabit={new Map([[HABIT.id, doneDates]])}
        gridDates={GRID_DATES}
        today={TODAY}
        loading={false}
        history={history}
        onToggleDate={toggleDate}
        onArchive={async () => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
      />
    </Shell>
  );
}
