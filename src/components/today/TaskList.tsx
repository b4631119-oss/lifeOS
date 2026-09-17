"use client";

import { minutesOfDay, useNowMs } from "@/hooks/useNowMs";
import { taskMarkers, type TaskMarker } from "@/lib/taskSchedule";
import type { Goal, LifeTask } from "@/types/lifeos";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import TaskItem from "./TaskItem";
import TodayEmptyState from "./TodayEmptyState";

/** Stable empty value, so a day without markers keeps a stable identity. */
const NO_MARKERS: Record<string, TaskMarker> = {};

interface TaskListProps {
  tasks: LifeTask[];
  loading: boolean;
  /** Whether the list belongs to today, which the empty state wording depends on. */
  isToday: boolean;
  /** The user's goals by id, so a linked task can show (and open) its goal. */
  goalsById: Record<string, Goal>;
  /** True once the goals list has answered, so a missing link is not guessed. */
  goalsResolved: boolean;
  /** The task that was just created, so its row can confirm the write. */
  highlightedId?: string | null;
  onToggle: (task: LifeTask) => void;
  onEdit: (task: LifeTask) => void;
  onDelete: (task: LifeTask) => void;
}

export default function TaskList({
  tasks,
  loading,
  isToday,
  goalsById,
  goalsResolved,
  highlightedId,
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  const t = useTranslations("today");
  const nowMs = useNowMs();

  /**
   * Now/next are only a statement about *today*, and only once the clock has
   * hydrated — the position cannot match between server and client, so before
   * that no row is marked. Derived from the same tasks the list draws, so the
   * two can never disagree.
   */
  const markers = useMemo(
    () =>
      isToday && nowMs !== null
        ? taskMarkers(tasks, minutesOfDay(nowMs))
        : NO_MARKERS,
    [isToday, nowMs, tasks],
  );

  if (loading) {
    return (
      <div className="app-card app-card-pad">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <TodayEmptyState isToday={isToday} />;
  }

  return (
    <ul className="space-y-2 sm:space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          goalsById={goalsById}
          goalsResolved={goalsResolved}
          marker={markers[task.id]}
          highlighted={task.id === highlightedId}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
