"use client";

import {
  addGoal as addGoalDoc,
  deleteGoal as deleteGoalDoc,
  subscribeToGoals,
  updateGoal,
} from "@/lib/firestore";
import type { Goal, NewGoal } from "@/types/lifeos";
import { useCallback, useEffect, useState } from "react";

type UseGoalsResult = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  createGoal: (goal: Omit<NewGoal, "createdAt">) => Promise<void>;
  updateGoal: (goalId: string, data: Partial<NewGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  /** Re-opens the subscription after it failed. */
  reload: () => void;
};

export function useGoals(uid: string | undefined): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the subscription effect below.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;

    return subscribeToGoals(
      uid,
      (nextGoals) => {
        setGoals(nextGoals);
        setError(null);
        setGoalsLoaded(true);
      },
      (cause) => {
        setError(cause.message);
        setGoalsLoaded(true);
      },
    );
  }, [uid, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setGoalsLoaded(false);
    setAttempt((value) => value + 1);
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error.");
      throw cause;
    }
  }, []);

  const createGoal = useCallback(
    (goal: Omit<NewGoal, "createdAt">) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await addGoalDoc(uid, goal as NewGoal);
      });
    },
    [uid, run],
  );

  const updateGoalFn = useCallback(
    (goalId: string, data: Partial<NewGoal>) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await updateGoal(uid, goalId, data);
      });
    },
    [uid, run],
  );

  const deleteGoalFn = useCallback(
    (goalId: string) => {
      if (!uid) return Promise.resolve();
      return run(async () => {
        await deleteGoalDoc(uid, goalId);
      });
    },
    [uid, run],
  );

  return {
    goals,
    loading: Boolean(uid) && !goalsLoaded,
    error,
    createGoal,
    updateGoal: updateGoalFn,
    deleteGoal: deleteGoalFn,
    reload,
  };
}