"use client";

import { useTodayKey } from "@/hooks/useTodayKey";
import { dayKeyFor } from "@/lib/date";
import { dayOffsetFor } from "@/lib/week";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The one day every planning view is looking at.
 *
 * Today and the Schedule used to be hard-wired to the current date, so there
 * was no way to see any other day. They now share this context instead, which
 * gives them the same date, the same tasks collection and the same navigation.
 *
 * The state is an *offset* from today rather than an absolute date on purpose:
 * an offset of 0 keeps following the calendar, so a tab left open across
 * midnight moves to the new day instead of silently staying on a date that has
 * just become yesterday.
 */
type DayContextValue = {
  /** Today, re-resolved when the calendar day changes. */
  today: string;
  /** The day being looked at, `YYYY-MM-DD`. */
  date: string;
  /** Signed distance from today, in days. */
  offset: number;
  isToday: boolean;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  /**
   * Selects a specific date, however far from today it is.
   *
   * This is how a *named* day reaches the day navigation — the Week view knows
   * which date it wants, while Today and the Schedule go on working in offsets
   * (`goToPreviousDay` and friends), so there is still only one date system.
   */
  goToDate: (key: string) => void;
};

const DayContext = createContext<DayContextValue | undefined>(undefined);

export function useDay(): DayContextValue {
  const context = useContext(DayContext);
  if (!context) {
    throw new Error("useDay must be used within a DayProvider");
  }
  return context;
}

export function DayProvider({ children }: { children: ReactNode }) {
  const today = useTodayKey();
  const [offset, setOffset] = useState(0);

  const goToPreviousDay = useCallback(
    () => setOffset((value) => value - 1),
    [],
  );
  const goToNextDay = useCallback(() => setOffset((value) => value + 1), []);
  const goToToday = useCallback(() => setOffset(0), []);
  const goToDate = useCallback(
    (key: string) => setOffset(dayOffsetFor(today, key)),
    [today],
  );

  const value = useMemo<DayContextValue>(() => {
    const date = dayKeyFor(today, offset);

    return {
      today,
      date,
      offset,
      isToday: date === today,
      goToPreviousDay,
      goToNextDay,
      goToToday,
      goToDate,
    };
  }, [today, offset, goToPreviousDay, goToNextDay, goToToday, goToDate]);

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}
