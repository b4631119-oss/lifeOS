"use client";

import { todayKey } from "@/lib/date";
import {
  addTask as createTaskDoc,
  deleteTask as deleteTaskDoc,
  subscribeToTasks,
  updateTask as updateTaskDoc,
} from "@/lib/firestore";
import type { LifeTask, NewTask } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";

/** A task payload without the `date` field, which the hook fills in for today. */
export type TaskDraft = Omit<NewTask, "date">;

type UseTodayTasksResult = {
  tasks: LifeTask[];
  loading: boolean;
  error: string | null;
  createTask: (task: TaskDraft) => Promise<void>;
  editTask: (taskId: string, data: Partial<TaskDraft>) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  toggleTaskDone: (task: LifeTask) => Promise<void>;
};

/**
 * Subscribes to the signed-in user's tasks for today (real time) and exposes
 * create/update/delete actions. Mutations propagate back through the snapshot,
 * so no manual refetch is needed.
 */
export function useTodayTasks(uid: string | undefined): UseTodayTasksResult {
  const date = useMemo(() => todayKey(), []);
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToTasks(
      uid,
      date,
      (nextTasks) => {
        setTasks(nextTasks);
        setError(null);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );
  }, [uid, date]);

  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error.");
      throw cause;
    }
  }, []);

  const createTask = useCallback(
    (task: TaskDraft) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await createTaskDoc(uid, { ...task, date });
      });
    },
    [uid, date, run],
  );

  const editTask = useCallback(
    (taskId: string, data: Partial<TaskDraft>) => {
      if (!uid) return Promise.resolve();

      // The previous status decides whether a completion time has to be
      // stamped, and it is already in memory here — so re-saving a finished
      // task keeps its original completion time instead of resetting it.
      const previousStatus = tasks.find((task) => task.id === taskId)?.status;

      return run(() => updateTaskDoc(uid, taskId, data, previousStatus));
    },
    [uid, tasks, run],
  );

  const removeTask = useCallback(
    (taskId: string) => {
      if (!uid) return Promise.resolve();
      return run(() => deleteTaskDoc(uid, taskId));
    },
    [uid, run],
  );

  const toggleTaskDone = useCallback(
    (task: LifeTask) => {
      if (!uid) return Promise.resolve();
      const status = task.status === "done" ? "todo" : "done";
      return run(() => updateTaskDoc(uid, task.id, { status }));
    },
    [uid, run],
  );

  return {
    tasks,
    loading,
    error,
    createTask,
    editTask,
    removeTask,
    toggleTaskDone,
  };
}
