"use client";

import { useTranslations } from "next-intl";
import type { LifeTask } from "@/types/lifeos";

interface UnscheduledTasksProps {
  /** The day's tasks that have no time at all. */
  tasks: LifeTask[];
  onEdit: (task: LifeTask) => void;
}

/**
 * The timeline only knows about tasks that have a time, so the unscheduled ones
 * would otherwise be invisible on the Schedule. They are listed here as chips —
 * reading the day honestly without pretending they sit at some hour — and open
 * the same edit dialog as a block, where a time can be given.
 */
export default function UnscheduledTasks({
  tasks,
  onEdit,
}: UnscheduledTasksProps) {
  const t = useTranslations("schedule");

  if (tasks.length === 0) return null;

  return (
    <section
      aria-labelledby="unscheduled-title"
      className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <h3
        id="unscheduled-title"
        className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("unscheduledTitle")}{" "}
        <span className="font-normal text-gray-500 dark:text-gray-400">
          ({tasks.length})
        </span>
      </h3>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        {t("unscheduledHint")}
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="max-w-full">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={t("unscheduledOpen", { title: task.title })}
              className="min-h-11 max-w-full truncate rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
            >
              {task.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
