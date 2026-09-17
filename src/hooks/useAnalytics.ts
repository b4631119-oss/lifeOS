"use client";

import { MAX_RANGE_DAYS } from "@/lib/analytics";
import { recentDayRange } from "@/lib/date";
import { getTaskRange } from "@/lib/firestore";
import type { LifeTask } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTodayKey } from "./useTodayKey";

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
 * Deliberately not a subscription: `useDayTasks` holds one day at a time, and
 * an analytics view is an aggregation over a period rather than a mirror of the
 * current day, so there is no need to keep a 30 day snapshot open. Habit data
 * comes from the existing real-time `useHabits` instead of a second query here.
 *
 * The read is a **closed** range ending today: the page aggregates the last
 * `MAX_RANGE_DAYS` days and nothing else, so there is no reason to pull in the
 * tasks a user has planned for next month as well. The window follows the
 * calendar day, so a tab left open past midnight re-reads the right period.
 */
export function useAnalytics(uid: string | undefined): UseAnalyticsResult {
  const today = useTodayKey();
  // The window is derived from the day, so it changes exactly once a day and
  // the effect below re-reads then — no refetch on any other render.
  const range = useMemo(
    () => recentDayRange(today, MAX_RANGE_DAYS),
    [today],
  );

  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getTaskRange(uid, range)
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
  }, [uid, range, attempt]);

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
