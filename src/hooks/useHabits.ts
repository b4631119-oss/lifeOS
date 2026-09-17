"use client";

import { recentDayRange } from "@/lib/date";
import {
  addHabit,
  addHabitLog,
  deleteHabit as deleteHabitDoc,
  deleteHabitLogs,
  subscribeToHabitLogs,
  subscribeToHabits,
  updateHabit,
  updateHabitLog,
} from "@/lib/firestore";
import {
  habitLogAction,
  indexDoneDates,
  isMarkable,
  STREAK_LOOKBACK_DAYS,
} from "@/lib/habits";
import type { Habit, HabitLog } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTodayKey } from "./useTodayKey";

type UseHabitsResult = {
  activeHabits: Habit[];
  archivedHabits: Habit[];
  /** habitId -> set of `YYYY-MM-DD` dates the habit was completed. */
  doneDatesByHabit: Map<string, Set<string>>;
  /** Today as `YYYY-MM-DD`. */
  today: string;
  loading: boolean;
  error: string | null;
  createHabit: (name: string) => Promise<void>;
  renameHabit: (habitId: string, name: string) => Promise<void>;
  setHabitActive: (habitId: string, active: boolean) => Promise<void>;
  /**
   * Flips one habit's check-in for an explicit day.
   *
   * The date is a parameter, not "today": the history strip marks any day the
   * user can see, and backfilling yesterday is as ordinary as today. A day in the
   * future is refused (`isMarkable`) — there is nothing to have done yet.
   */
  toggleHabit: (habitId: string, date: string) => Promise<void>;
  /** Permanently removes a habit together with all of its logs. */
  deleteHabit: (habitId: string) => Promise<void>;
  /** Re-opens both subscriptions after they failed. */
  reload: () => void;
};

/**
 * Subscribes to the user's habits and to a bounded window of habit logs.
 *
 * One log subscription serves both the 12 week activity grid and the streak
 * lookback, so the page never issues per-habit queries.
 */
export function useHabits(uid: string | undefined): UseHabitsResult {
  // Both the check-in day and the window the logs are read for follow the
  // calendar: after midnight the toggle writes the new day and the grid and
  // streaks shift with it, without a reload.
  const today = useTodayKey();
  // The log window: a closed range ending today. One subscription serves the
  // streak lookback, the 12 week overview and the history strip, whatever week
  // that strip is showing.
  const logRange = useMemo(
    () => recentDayRange(today, STREAK_LOOKBACK_DAYS),
    [today],
  );

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [habitsLoaded, setHabitsLoaded] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs both subscription effects below.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;

    return subscribeToHabits(
      uid,
      (nextHabits) => {
        setHabits(nextHabits);
        setError(null);
        setHabitsLoaded(true);
      },
      (cause) => {
        setError(cause.message);
        setHabitsLoaded(true);
      },
    );
  }, [uid, attempt]);

  useEffect(() => {
    if (!uid) return;

    return subscribeToHabitLogs(
      uid,
      logRange,
      (nextLogs) => {
        setLogs(nextLogs);
        setError(null);
        setLogsLoaded(true);
      },
      (cause) => {
        setError(cause.message);
        setLogsLoaded(true);
      },
    );
  }, [uid, logRange, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setHabitsLoaded(false);
    setLogsLoaded(false);
    setAttempt((value) => value + 1);
  }, []);

  const doneDatesByHabit = useMemo(() => indexDoneDates(logs), [logs]);

  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error.");
      throw cause;
    }
  }, []);

  const createHabit = useCallback(
    (name: string) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await addHabit(uid, { name: name.trim(), active: true });
      });
    },
    [uid, run],
  );

  const renameHabit = useCallback(
    (habitId: string, name: string) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await updateHabit(uid, habitId, { name: name.trim() });
      });
    },
    [uid, run],
  );

  const setHabitActive = useCallback(
    (habitId: string, active: boolean) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await updateHabit(uid, habitId, { active });
      });
    },
    [uid, run],
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        // Delete the habit's logs first, so an interruption leaves logs without
        // their habit rather than a habit whose history has vanished.
        await deleteHabitLogs(uid, habitId);
        await deleteHabitDoc(uid, habitId);
      });
    },
    [uid, run],
  );

  const toggleHabit = useCallback(
    (habitId: string, date: string) => {
      if (!uid) return Promise.resolve();
      if (!isMarkable(date, today)) return Promise.resolve();

      // One log per habit per day: flip the existing row, or create it.
      const action = habitLogAction(logs, habitId, date);

      return run(async () => {
        if (action.type === "update") {
          await updateHabitLog(uid, action.logId, { done: action.done });
        } else {
          await addHabitLog(uid, { habitId, date, done: true });
        }
      });
    },
    [uid, today, logs, run],
  );

  const activeHabits = useMemo(() => habits.filter((h) => h.active), [habits]);
  const archivedHabits = useMemo(
    () => habits.filter((h) => !h.active),
    [habits],
  );

  return {
    activeHabits,
    archivedHabits,
    doneDatesByHabit,
    today,
    loading: Boolean(uid) && !(habitsLoaded && logsLoaded),
    error,
    createHabit,
    renameHabit,
    setHabitActive,
    toggleHabit,
    deleteHabit,
    reload,
  };
}
