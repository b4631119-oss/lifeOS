"use client";

import { subscribeToGoalTasks } from "@/lib/firestore";
import type { LifeTask } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseGoalTasksResult = {
  /** Linked tasks per goal id. An id with nothing linked has no entry. */
  tasksByGoal: Record<string, LifeTask[]>;
  loading: boolean;
  error: string | null;
  /** Re-opens the subscriptions after a failure. */
  reload: () => void;
};

/**
 * Subscribes to the tasks linked to a set of goals.
 *
 * One listener per goal id, each a single-field equality query on `goalId`:
 * that returns exactly the linked work (no second list of "goal tasks" to keep
 * in step), stays inside `users/{uid}/tasks` where the owner-scoped rules
 * already apply, and needs no composite index. Two goals means two listeners,
 * which is why this is mounted on the goals pages only — never in Today.
 *
 * Nothing is loaded when there are no goals: an empty list costs no queries.
 */
export function useGoalTasks(
  uid: string | undefined,
  goalIds: string[],
): UseGoalTasksResult {
  // The subscription set is identified by the ids themselves, so a re-render
  // that rebuilds the array does not tear the listeners down and back up.
  const key = useMemo(() => [...goalIds].sort().join("|"), [goalIds]);

  /**
   * Buckets are kept as they arrive and never pruned: consumers look up the ids
   * they asked for, so a bucket left over from a removed goal is inert.
   */
  const [tasksByGoal, setTasksByGoal] = useState<Record<string, LifeTask[]>>(
    {},
  );
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid || key === "") return;

    const ids = key.split("|");
    const answered = new Set<string>();
    let cancelled = false;

    const unsubscribers = ids.map((id) =>
      subscribeToGoalTasks(
        uid,
        id,
        (tasks) => {
          if (cancelled) return;
          answered.add(id);
          setTasksByGoal((previous) => ({ ...previous, [id]: tasks }));
          if (answered.size === ids.length) setLoadedKey(key);
          setError(null);
        },
        (cause) => {
          if (!cancelled) setError(cause.message);
        },
      ),
    );

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [uid, key, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setLoadedKey(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    tasksByGoal,
    // Every listener has to have answered once before the numbers are shown, so
    // a goal never reads "no linked tasks" just because its bucket is in flight.
    loading: Boolean(uid) && key !== "" && loadedKey !== key && error === null,
    error,
    reload,
  };
}
