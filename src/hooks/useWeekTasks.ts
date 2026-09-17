"use client";

import {
  addTask as createTaskDoc,
  subscribeToTaskRange,
  updateTask as updateTaskDoc,
} from "@/lib/firestore";
import { DROP_PATCH, captureDraft } from "@/lib/taskSchedule";
import type { LifeTask, NewTask } from "@/types/lifeos";
import { useCallback, useEffect, useState } from "react";

import type { TaskError } from "./useDayTasks";

/** Stable empty list, so an empty week keeps a stable identity. */
const EMPTY_TASKS: LifeTask[] = [];

/** The two bulk actions, kept apart so the report can name what happened. */
export type BulkAction = "move" | "drop";

/** The outcome of a bulk action, reported honestly rather than as "done". */
export type BulkResult = {
  updated: number;
  failed: number;
  total: number;
  action: BulkAction;
};

type UseWeekTasksResult = {
  /** The week's tasks — nothing before its first day, nothing after its last. */
  tasks: LifeTask[];
  loading: boolean;
  error: TaskError | null;
  /**
   * Adds one task to a day of the week, from a title alone.
   *
   * Resolves with the new task's id, or `null` when nobody is signed in. The
   * week is planned in short bursts, so this is the capture every day card
   * uses: the day is the caller's, the title is the user's, and everything else
   * takes the defaults of `captureDraft` until the task is edited.
   */
  createTask: (date: string, title: string) => Promise<string | null>;
  /** Patches one task (move, drop, restore, mark done, …). */
  editTask: (taskId: string, data: Partial<NewTask>) => Promise<void>;
  /** Moves a task to another day, keeping everything else about it. */
  moveTask: (taskId: string, date: string) => Promise<void>;
  /** Moves several tasks to one day, one write at a time. */
  bulkMove: (taskIds: string[], date: string) => Promise<BulkResult>;
  /** Drops several tasks off the plan (`{ dropped: true }`). */
  bulkDrop: (taskIds: string[]) => Promise<BulkResult>;
  reload: () => void;
};

/**
 * Subscribes to the tasks of one week.
 *
 * The read is bounded at both ends — `date >= first day` and `date <= last day`
 * — so opening the Week view costs that week's tasks and not the user's whole
 * future. There is no week document and no per-day query: one listener serves
 * the seven days, the review numbers and the recovery list, so all three always
 * agree with each other and with what is in Firestore.
 *
 * The range is the same `tasks` collection Today and the Schedule write to, so a
 * task moved here is already on the right day everywhere else.
 */
export function useWeekTasks(
  uid: string | undefined,
  startKey: string,
  endKey: string,
): UseWeekTasksResult {
  /** Identifies the exact range a snapshot was read for. */
  const rangeKey = `${startKey}|${endKey}`;

  /**
   * The last snapshot, tagged with the range it belongs to.
   *
   * The tag is what makes switching weeks safe: while the new week's read is in
   * flight the stored tasks belong to the previous week, so they are not shown
   * at all instead of briefly appearing under the wrong dates.
   */
  const [snapshot, setSnapshot] = useState<{
    key: string;
    tasks: LifeTask[];
  } | null>(null);
  const [error, setError] = useState<TaskError | null>(null);
  // Bumping this re-runs the subscription effect below.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;

    return subscribeToTaskRange(
      uid,
      { from: startKey, to: endKey },
      (nextTasks) => {
        setSnapshot({ key: rangeKey, tasks: nextTasks });
        setError(null);
      },
      (subscriptionError) =>
        setError({ kind: "load", message: subscriptionError.message }),
    );
  }, [uid, startKey, endKey, rangeKey, attempt]);

  const current = snapshot && snapshot.key === rangeKey ? snapshot.tasks : null;
  const tasks = current ?? EMPTY_TASKS;
  const loading = Boolean(uid) && current === null && error?.kind !== "load";

  const reload = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  // Generic, so an action's result (the id of a newly created task) survives
  // the shared error handling instead of being swallowed by it.
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (cause) {
      setError({
        kind: "action",
        message: cause instanceof Error ? cause.message : "Unexpected error.",
      });
      throw cause;
    }
  }, []);

  const createTask = useCallback(
    (date: string, title: string) => {
      if (!uid) return Promise.resolve(null);
      // Capture-first: a title and the day it was written into, nothing else.
      return run(() => createTaskDoc(uid, { ...captureDraft(title), date }));
    },
    [uid, run],
  );

  const editTask = useCallback(
    (taskId: string, data: Partial<NewTask>) => {
      if (!uid) return Promise.resolve();

      // The previous status decides whether a completion time has to be
      // stamped, and it is already in memory here — so editing a task that was
      // finished earlier keeps the moment it was actually finished.
      const previousStatus = (current ?? []).find(
        (task) => task.id === taskId,
      )?.status;

      return run(() => updateTaskDoc(uid, taskId, data, previousStatus));
    },
    [uid, current, run],
  );

  const moveTask = useCallback(
    (taskId: string, date: string) => editTask(taskId, { date }),
    [editTask],
  );

  /**
   * Applies one patch to several tasks, one write at a time.
   *
   * Sequential on purpose: a burst of parallel writes is harder to reason about
   * when some of them fail, and a personal week is a handful of tasks. The
   * result reports what actually happened, so a partial move is never presented
   * as a complete one.
   */
  const runBulk = useCallback(
    async (
      action: BulkAction,
      taskIds: string[],
      data: Partial<NewTask>,
    ): Promise<BulkResult> => {
      if (!uid || taskIds.length === 0) {
        return { updated: 0, failed: 0, total: 0, action };
      }

      setError(null);

      let updated = 0;
      let failed = 0;

      for (const taskId of taskIds) {
        try {
          await updateTaskDoc(uid, taskId, data);
          updated += 1;
        } catch (cause) {
          failed += 1;
          setError({
            kind: "action",
            message: cause instanceof Error ? cause.message : "Unexpected error.",
          });
        }
      }

      return { updated, failed, total: taskIds.length, action };
    },
    [uid],
  );

  const bulkMove = useCallback(
    (taskIds: string[], date: string) => runBulk("move", taskIds, { date }),
    [runBulk],
  );

  const bulkDrop = useCallback(
    (taskIds: string[]) => runBulk("drop", taskIds, DROP_PATCH),
    [runBulk],
  );

  return {
    tasks,
    loading,
    error,
    createTask,
    editTask,
    moveTask,
    bulkMove,
    bulkDrop,
    reload,
  };
}
