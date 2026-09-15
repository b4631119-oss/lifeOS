"use client";

import { ChevronDownIcon } from "@/icons";
import type { Habit } from "@/types/lifeos";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import HabitActionsMenu from "./HabitActionsMenu";

interface ArchivedHabitsProps {
  habits: Habit[];
  onReactivate: (habitId: string) => Promise<void>;
  onRename: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

export default function ArchivedHabits({
  habits,
  onReactivate,
  onRename,
  onDelete,
}: ArchivedHabitsProps) {
  const t = useTranslations("habits");
  const [isOpen, setIsOpen] = useState(false);

  if (habits.length === 0) return null;

  const handleReactivate = async (habitId: string) => {
    try {
      await onReactivate(habitId);
    } catch {
      // The hook surfaces the error on the page.
    }
  };

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-start"
      >
        <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
          {t("archived")} ({habits.length})
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <>
          <p className="mt-1 mb-3 px-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("archivedHint")}
          </p>

          <ul className="space-y-2">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                  {habit.name}
                </span>

                <HabitActionsMenu
                  label={t("moreOptions")}
                  actions={[
                    {
                      key: "rename",
                      label: t("rename"),
                      onSelect: () => onRename(habit),
                    },
                    {
                      key: "reactivate",
                      label: t("reactivate"),
                      onSelect: () => handleReactivate(habit.id),
                    },
                    {
                      key: "delete",
                      label: t("delete"),
                      onSelect: () => onDelete(habit),
                      destructive: true,
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
