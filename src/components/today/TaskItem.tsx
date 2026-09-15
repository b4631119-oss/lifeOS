"use client";

import { CheckLineIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { formatTimeRange } from "@/lib/date";
import type { LifeTask } from "@/types/lifeos";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskItemProps {
  task: LifeTask;
  onToggle: (task: LifeTask) => void;
  onEdit: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const t = useTranslations("today");
  const locale = useLocale();
  const isDone = task.status === "done";

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={isDone ? t("markTodo") : t("markDone")}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          isDone
            ? "border-success-500 bg-success-500 text-white"
            : "border-gray-300 text-transparent hover:border-brand-500 dark:border-gray-600",
        )}
      >
        <CheckLineIcon className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-theme-sm font-medium text-gray-800 dark:text-white/90",
            isDone && "text-gray-400 line-through dark:text-gray-500",
          )}
        >
          {task.title}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {formatTimeRange(task.startTime, task.endTime, locale)}
        </p>
      </div>

      <TaskStatusBadge status={task.status} />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={t("edit")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={t("delete")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
