"use client";

import {
  addTask as addTaskDoc,
  deleteTask as deleteTaskDoc,
  moveLegacySubtasksToTasks,
  subscribeToGoal,
  updateGoal as updateGoalDoc,
  updateTask as updateTaskDoc,
} from "@/lib/firestore";
import { captureDraft } from "@/lib/taskSchedule";
import type { Goal, GoalStatus, LifeTask } from "@/types/lifeos";
import { useCallback, useEffect, useState } from "react";
import { useGoalTasks } from "./useGoalTasks";
import { useTodayKey } from "./useTodayKey";

/** Stable empty list, so a goal with no work keeps a stable identity. */
const EMPTY_TASKS: LifeTask[] = [];

type UseGoalDetailResult = {
  /** `null` once the goal is known to be gone (deleted in another tab). */
  goal: Goal | null;
  /** True once the goal document has answered at least once. */
  loaded: boolean;
  /** The tasks linked to this goal, real time. */
  tasks: LifeTask[];
  loading: boolean;
  /** A failed read — the banner with a retry. */
  error: string | null;
  /** A failed write — reported next to the action that caused it. */
  actionError: string | null;
  /** Adds a real task for today, linked to this goal. */
  createTask: (title: string) => Promise<void>;
  toggleTask: (task: LifeTask) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  setStatus: (status: GoalStatus) => Promise<void>;
  /** Moves the goal's remaining pre-task steps into tasks; returns how many. */
  moveSubtasks: () => Promise<number>;
  reload: () => void;
};

/**
 * Everything one goal's page needs: the goal itself, the work linked to it, and
 * the few writes that page performs.
 *
 * The two reads are the smallest ones that answer the page's question — the
 * goal document, and the tasks whose `goalId` is this goal — so the page never
 * loads the user's whole task history to draw one progress count.
 */
export function useGoalDetail(
  uid: string | undefined,
  goalId: string,
): UseGoalDetailResult {
  const today = useTodayKey();
  const {
    tasksByGoal,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useGoalTasks(uid, goalId ? [goalId] : []);

  /** Tagged with the id it was read for, so a switched goal never shows stale data. */
  const [snapshot, setSnapshot] = useState<{
    id: string;
    goal: Goal | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid || !goalId) return;

    return subscribeToGoal(
      uid,
      goalId,
      (nextGoal) => {
        setSnapshot({ id: goalId, goal: nextGoal });
        setError(null);
      },
      (cause) => setError(cause.message),
    );
  }, [uid, goalId, attempt]);

  const loaded = snapshot?.id === goalId;
  const goal = loaded ? (snapshot?.goal ?? null) : null;

  const run = useCallback(async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unexpected error.");
      throw cause;
    }
  }, []);

  const createTask = useCallback(
    (title: string) => {
      if (!uid || !goalId) return Promise.resolve();

      return run(async () => {
        await addTaskDoc(uid, {
          // The same capture defaults as Today — one definition, so a task
          // written here cannot be a differently-shaped task.
          ...captureDraft(title),
          // Today, because the goal page is about what moves the goal now; the
          // task can be moved to another day from Today or the Schedule.
          date: today,
          goalId,
        });
      });
    },
    [uid, goalId, today, run],
  );

  const toggleTask = useCallback(
    (task: LifeTask) => {
      if (!uid) return Promise.resolve();

      const status = task.status === "done" ? "todo" : "done";
      return run(() => updateTaskDoc(uid, task.id, { status }, task.status));
    },
    [uid, run],
  );

  const removeTask = useCallback(
    (taskId: string) => {
      if (!uid) return Promise.resolve();
      return run(() => deleteTaskDoc(uid, taskId));
    },
    [uid, run],
  );

  const setStatus = useCallback(
    (status: GoalStatus) => {
      if (!uid || !goalId) return Promise.resolve();
      return run(() => updateGoalDoc(uid, goalId, { status }));
    },
    [uid, goalId, run],
  );

  const moveSubtasks = useCallback(async () => {
    if (!uid || !goal) return 0;

    let moved = 0;
    await run(async () => {
      moved = await moveLegacySubtasksToTasks(uid, goal, today);
    });
    return moved;
  }, [uid, goal, today, run]);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
    reloadTasks();
  }, [reloadTasks]);

  return {
    goal,
    loaded,
    tasks: tasksByGoal[goalId] ?? EMPTY_TASKS,
    loading: Boolean(uid) && (!loaded || tasksLoading),
    error: error ?? tasksError,
    actionError,
    createTask,
    toggleTask,
    removeTask,
    setStatus,
    moveSubtasks,
    reload,
  };
}
