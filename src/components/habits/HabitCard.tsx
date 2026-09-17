"use client";

import { CheckLineIcon } from "@/icons";
import { computeBestStreak, computeCurrentStreak } from "@/lib/habits";
import type { Habit } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import HabitActionsMenu from "./HabitActionsMenu";
import HabitActivityGrid from "./HabitActivityGrid";
import HabitHistoryStrip, {
  type HabitHistoryControls,
} from "./HabitHistoryStrip";
import StreakBadge from "./StreakBadge";

interface HabitCardProps {
  habit: Habit;
  doneDates: ReadonlySet<string>;
  gridDates: string[];
  today: string;
  history: HabitHistoryControls;
  onToggleDate: (habitId: string, date: string) => Promise<void>;
  onArchive: (habitId: string) => Promise<void>;
  onRename: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export default function HabitCard({
  habit,
  doneDates,
  gridDates,
  today,
  history,
  onToggleDate,
  onArchive,
  onRename,
  onDelete,
}: HabitCardProps) {
  const t = useTranslations("habits");

  const isDoneToday = doneDates.has(today);
  const currentStreak = useMemo(
    () => computeCurrentStreak(doneDates, today),
    [doneDates, today],
  );
  const bestStreak = useMemo(() => computeBestStreak(doneDates), [doneDates]);

  const handleArchive = async () => {
    try {
      await onArchive(habit.id);
    } catch {
      // The hook surfaces the error on the page.
    }
  };

  const handleToggleToday = () => {
    void Promise.resolve(onToggleDate(habit.id, today)).catch(() => {
      // The hook surfaces the error on the page.
    });
  };

  return (
    <li className="app-card app-card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {habit.name}
          </h3>
          <div className="mt-2">
            <StreakBadge current={currentStreak} best={bestStreak} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleToday}
            aria-pressed={isDoneToday}
            className={cn(
              // 44px tall: the daily check-in is the button a thumb reaches for,
              // and it was a few pixels short of a comfortable target.
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
              isDoneToday
                ? "bg-success-500 text-white hover:bg-success-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
            )}
          >
            <CheckLineIcon className="h-4 w-4" />
            {t("today")}
          </button>

          <HabitActionsMenu
            label={t("moreOptions")}
            actions={[
              {
                key: "rename",
                label: t("rename"),
                onSelect: () => onRename(habit),
              },
              {
                key: "archive",
                label: t("archive"),
                onSelect: handleArchive,
              },
              {
                key: "delete",
                label: t("delete"),
                onSelect: () => onDelete(habit),
                destructive: true,
              },
            ]}
          />
        </div>
      </div>

      {/* The 12 week overview: density at a glance, nothing to press. Hidden from
          assistive technology because it is 84 unlabelled squares that only
          restate what the cells below say properly. */}
      <div className="mt-4 overflow-x-auto" aria-hidden="true">
        <HabitActivityGrid
          dates={gridDates}
          doneDates={doneDates}
          today={today}
        />
      </div>

      {/* ...and the part that is used: one pressable row of days, at the bottom
          of the card where a thumb actually reaches. */}
      <HabitHistoryStrip
        habitName={habit.name}
        dates={history.dates}
        doneDates={doneDates}
        today={today}
        isCurrent={history.isCurrent}
        canGoBack={history.canGoBack}
        onShift={history.shift}
        onToday={history.showToday}
        onToggle={(date) => onToggleDate(habit.id, date)}
      />
    </li>
  );
}
