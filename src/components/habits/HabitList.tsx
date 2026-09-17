"use client";

import { EMPTY_DATES } from "@/lib/habits";
import type { Habit } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import HabitCard from "./HabitCard";
import HabitEmptyState from "./HabitEmptyState";
import type { HabitHistoryControls } from "./HabitHistoryStrip";

interface HabitListProps {
  habits: Habit[];
  doneDatesByHabit: Map<string, Set<string>>;
  gridDates: string[];
  today: string;
  loading: boolean;
  history: HabitHistoryControls;
  onToggleDate: (habitId: string, date: string) => Promise<void>;
  onArchive: (habitId: string) => Promise<void>;
  onRename: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export default function HabitList({
  habits,
  doneDatesByHabit,
  gridDates,
  today,
  loading,
  history,
  onToggleDate,
  onArchive,
  onRename,
  onDelete,
}: HabitListProps) {
  const t = useTranslations("habits");

  if (loading) {
    return (
      <div className="app-card app-card-pad">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (habits.length === 0) {
    return <HabitEmptyState />;
  }

  return (
    <ul className="space-y-4">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          doneDates={doneDatesByHabit.get(habit.id) ?? EMPTY_DATES}
          gridDates={gridDates}
          today={today}
          history={history}
          onToggleDate={onToggleDate}
          onArchive={onArchive}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
