"use client";

import { MAX_RANGE_DAYS } from "@/lib/analytics";
import { addDays, dateKey } from "@/lib/date";
import { getTasksSince } from "@/lib/firestore";
import type { LifeTask } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAnalyticsResult = {
  /** Tasks from the widest window (30 days), newest data included. */
  tasks: LifeTask[];
  loading: boolean;
  error: string | null;
  /** Re-runs the fetch, e.g. from the error banner's retry button. */
  reload: () => void;
};

/**
 * One-shot read of the task history the analytics page needs.
 *
 * Deliberately not a subscription: `useTodayTasks` only ever holds today, and
 * an analytics view is an aggregation over a period rather than a mirror of the
 * current day, so there is no need to keep a 30 day snapshot open. Habit data
 * comes from the existing real-time `useHabits` instead of a second query here.
 */
export function useAnalytics(uid: string | undefined): UseAnalyticsResult {
  const fromDate = useMemo(
    () => dateKey(addDays(new Date(), -(MAX_RANGE_DAYS - 1))),
    [],
  );

  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getTasksSince(uid, fromDate)
      .then((nextTasks) => {
        if (cancelled) return;
        setTasks(nextTasks);
        setError(null);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unexpected error.");
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, fromDate, attempt]);

  const reload = useCallback(() => {
    setLoaded(false);
    setAttempt((value) => value + 1);
  }, []);

  return {
    tasks,
    loading: Boolean(uid) && !loaded,
    error,
    reload,
  };
}
