"use client";

import { addDays, dateKey, parseDateKey } from "@/lib/date";
import {
  addTask as createTaskDoc,
  deleteTask as deleteTaskDoc,
  subscribeToTaskRange,
  subscribeToTasks,
  updateTask as updateTaskDoc,
} from "@/lib/firestore";
import {
  compareDayTasks,
  groupUnfinishedByDay,
  type DayGroup,
} from "@/lib/taskSchedule";
import type { LifeTask, NewTask } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";

/** A task payload without the `date` field, which the hook fills in for the day. */
export type TaskDraft = Omit<NewTask, "date">;

/**
 * A failure plus where it came from. The two read completely differently to the
 * user ("we couldn't load" versus "we couldn't save"), and reporting both with
 * the loading wording — as this hook used to — is simply wrong.
 */
export type TaskError = { kind: "load" | "action"; message: string };

export type UseDayTasksOptions = {
  /**
   * How many days of *unfinished* work to load along with the day.
   *
   * `0` (default) subscribes to the day alone — the Schedule has no history.
   * Today passes a window, and that single snapshot then serves both the day's
   * list and the recovery panel: one listener, one source of truth, so a
   * carried task leaves the panel exactly when Firestore confirms the write
   * rather than when the UI hopes it did.
   */
  historyDays?: number;
};

/** Stable empty values, so an empty day keeps a stable identity. */
const EMPTY_TASKS: LifeTask[] = [];
const EMPTY_GROUPS: DayGroup[] = [];

/** Identifies the day *and* the window a snapshot was read for. */
function windowKeyOf(date: string, fromDate: string): string {
  return `${date}|${fromDate}`;
}

type UseDayTasksResult = {
  /** The tasks of `date`, in day order. */
  tasks: LifeTask[];
  /** Open tasks from earlier days, newest day first (empty without `historyDays`). */
  unfinished: DayGroup[];
  loading: boolean;
  error: TaskError | null;
  createTask: (task: TaskDraft) => Promise<void>;
  editTask: (taskId: string, data: Partial<NewTask>) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  toggleTaskDone: (task: LifeTask) => Promise<void>;
  /** Re-opens the subscription after it failed, e.g. when the network came back. */
  reload: () => void;
};

/**
 * Subscribes to the signed-in user's tasks for one day (real time) and exposes
 * create/update/delete actions. Mutations propagate back through the snapshot,
 * so no manual refetch is needed.
 *
 * The day is a parameter rather than "today": the Today and Schedule views
 * share one selected date, and both read the very same `tasks` collection.
 */
export function useDayTasks(
  uid: string | undefined,
  date: string,
  options: UseDayTasksOptions = {},
): UseDayTasksResult {
  const historyDays = options.historyDays ?? 0;
  const fromDate =
    historyDays > 0 ? dateKey(addDays(parseDateKey(date), -historyDays)) : date;

  /**
   * The last snapshot, tagged with the day and window it was read for.
   *
   * The tag is what makes a date change safe without resetting state from an
   * effect: while the new subscription is still in flight the stored snapshot
   * belongs to the previous day, so it is not shown at all (see `tasks` and
   * `loading` below).
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

    const onNext = (nextTasks: LifeTask[]) => {
      setSnapshot({ key: windowKeyOf(date, fromDate), tasks: nextTasks });
      setError(null);
    };
    const onError = (subscriptionError: Error) => {
      setError({ kind: "load", message: subscriptionError.message });
    };

    return historyDays > 0
      ? subscribeToTaskRange(uid, { from: fromDate }, onNext, onError)
      : subscribeToTasks(uid, date, onNext, onError);
  }, [uid, date, fromDate, historyDays, attempt]);

  const current =
    snapshot && snapshot.key === windowKeyOf(date, fromDate)
      ? snapshot.tasks
      : null;

  const tasks = useMemo(() => {
    if (!current) return EMPTY_TASKS;
    // Without a history window the query is already day-scoped and sorted.
    const forDay = current.filter((task) => task.date === date);
    return forDay.length === current.length
      ? current
      : forDay.sort(compareDayTasks);
  }, [current, date]);

  const unfinished = useMemo(
    () =>
      historyDays > 0 && current
        ? groupUnfinishedByDay(current, date)
        : EMPTY_GROUPS,
    [current, date, historyDays],
  );

  // A previous day's tasks must not appear under this day's header, so anything
  // that is not a snapshot of this day reads as an empty, still-loading list.
  const loading = Boolean(uid) && current === null && error?.kind !== "load";

  const reload = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      setError({
        kind: "action",
        message: cause instanceof Error ? cause.message : "Unexpected error.",
      });
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
    (taskId: string, data: Partial<NewTask>) => {
      if (!uid) return Promise.resolve();

      // The previous status decides whether a completion time has to be
      // stamped, and it is already in memory here — so re-saving a finished task
      // keeps its original completion time instead of resetting it. Looked up
      // across the whole loaded window, so a recovery action on an older task
      // finds it too.
      const previousStatus = (current ?? []).find(
        (task) => task.id === taskId,
      )?.status;

      return run(() => updateTaskDoc(uid, taskId, data, previousStatus));
    },
    [uid, current, run],
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
    unfinished,
    loading,
    error,
    createTask,
    editTask,
    removeTask,
    toggleTaskDone,
    reload,
  };
}
