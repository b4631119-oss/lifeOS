"use client";

import { addDays, dateKey, todayKey } from "@/lib/date";
import {
  addHabit,
  addHabitLog,
  deleteHabit as deleteHabitDoc,
  deleteHabitLog,
  getHabitLogs,
  subscribeToHabitLogs,
  subscribeToHabits,
  updateHabit,
  updateHabitLog,
} from "@/lib/firestore";
import { indexDoneDates, STREAK_LOOKBACK_DAYS } from "@/lib/habits";
import type { Habit, HabitLog } from "@/types/lifeos";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  toggleHabit: (habitId: string) => Promise<void>;
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
  const today = useMemo(() => todayKey(), []);
  const fromDate = useMemo(
    () => dateKey(addDays(new Date(), -(STREAK_LOOKBACK_DAYS - 1))),
    [],
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
      fromDate,
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
  }, [uid, fromDate, attempt]);

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
        // Read the full log history (not just the loaded window) so no orphaned
        // habitLogs survive the delete.
        const allLogs = await getHabitLogs(uid);
        const relatedLogs = allLogs.filter((log) => log.habitId === habitId);

        await Promise.all(relatedLogs.map((log) => deleteHabitLog(uid, log.id)));
        await deleteHabitDoc(uid, habitId);
      });
    },
    [uid, run],
  );

  const toggleHabit = useCallback(
    (habitId: string) => {
      if (!uid) return Promise.resolve();

      // One log per habit per day: flip the existing row, or create it.
      const existing = logs.find(
        (log) => log.habitId === habitId && log.date === today,
      );

      return run(async () => {
        if (existing) {
          await updateHabitLog(uid, existing.id, { done: !existing.done });
        } else {
          await addHabitLog(uid, { habitId, date: today, done: true });
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
