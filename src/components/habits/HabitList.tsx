"use client";

import { EMPTY_DATES } from "@/lib/habits";
import type { Habit } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import HabitCard from "./HabitCard";
import HabitEmptyState from "./HabitEmptyState";

interface HabitListProps {
  habits: Habit[];
  doneDatesByHabit: Map<string, Set<string>>;
  gridDates: string[];
  today: string;
  loading: boolean;
  onToggle: (habitId: string) => Promise<void>;
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
  onToggle,
  onArchive,
  onRename,
  onDelete,
}: HabitListProps) {
  const t = useTranslations("habits");

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
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
          onToggle={onToggle}
          onArchive={onArchive}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
