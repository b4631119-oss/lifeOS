"use client";

import { CheckLineIcon } from "@/icons";
import { computeBestStreak, computeCurrentStreak } from "@/lib/habits";
import type { Habit } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import HabitActionsMenu from "./HabitActionsMenu";
import HabitActivityGrid from "./HabitActivityGrid";
import StreakBadge from "./StreakBadge";

interface HabitCardProps {
  habit: Habit;
  doneDates: ReadonlySet<string>;
  gridDates: string[];
  today: string;
  onToggle: (habitId: string) => Promise<void>;
  onArchive: (habitId: string) => Promise<void>;
  onRename: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export default function HabitCard({
  habit,
  doneDates,
  gridDates,
  today,
  onToggle,
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

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
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
            onClick={() => onToggle(habit.id)}
            aria-pressed={isDoneToday}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
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

      <div className="mt-4 overflow-x-auto">
        <HabitActivityGrid
          dates={gridDates}
          doneDates={doneDates}
          today={today}
        />
      </div>
    </li>
  );
}
