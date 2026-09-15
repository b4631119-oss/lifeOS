"use client";

import type { LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import TaskItem from "./TaskItem";
import TodayEmptyState from "./TodayEmptyState";

interface TaskListProps {
  tasks: LifeTask[];
  loading: boolean;
  onToggle: (task: LifeTask) => void;
  onEdit: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

export default function TaskList({
  tasks,
  loading,
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  const t = useTranslations("today");

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <TodayEmptyState />;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
