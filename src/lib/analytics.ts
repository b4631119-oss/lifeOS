import { addDays, dateKey, formatShortDay, formatTime, parseDateKey } from "@/lib/date";
import {
  computeBestStreak,
  computeCurrentStreak,
  EMPTY_DATES,
} from "@/lib/habits";
import { tasksInPlan } from "@/lib/taskSchedule";
import type { Habit, LifeTask } from "@/types/lifeos";

/**
 * Pure aggregation for the analytics page.
 *
 * Everything here is a plain function over already-loaded data — no Firebase,
 * no React — so the maths can be reasoned about (and tested) on its own, the
 * same way `lib/habits.ts` holds the streak rules for the habits module.
 */

/** Windows the task charts can show. */
export const RANGE_DAYS = [7, 30] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

/**
 * Widest window we load. The 7 day view is sliced out of the same response, so
 * flipping the range switch never costs a round trip.
 */
export const MAX_RANGE_DAYS: RangeDays = 30;

/** `YYYY-MM-DD` keys for the last `days` days, today last. */
export function recentDayKeys(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, index) =>
    dateKey(addDays(now, -(days - 1 - index))),
  );
}

/** Tasks whose `date` falls within the last `days` days. */
export function tasksWithinDays(
  tasks: LifeTask[],
  days: number,
  now: Date = new Date(),
): LifeTask[] {
  const window = new Set(recentDayKeys(days, now));
  return tasks.filter((task) => window.has(task.date));
}

/* ------------------------------ task completion ----------------------------- */

export type DailyCompletion = {
  /** `YYYY-MM-DD` */
  date: string;
  /** Localized short day label for the x axis, e.g. "14 Sep". */
  label: string;
  total: number;
  done: number;
  /** 0–100, or `null` on days with nothing planned. */
  percent: number | null;
};

/** One point per day, oldest first, for the completion-rate chart. */
export function buildDailyCompletionSeries(
  tasks: LifeTask[],
  days: number,
  locale: string,
  now: Date = new Date(),
): DailyCompletion[] {
  const byDate = new Map<string, { total: number; done: number }>();

  // Dropped tasks are off the plan for that day, so they are not part of the
  // day's rate either — see `tasksInPlan`.
  for (const task of tasksInPlan(tasks)) {
    const bucket = byDate.get(task.date) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (task.status === "done") bucket.done += 1;
    byDate.set(task.date, bucket);
  }

  return recentDayKeys(days, now).map((date) => {
    const bucket = byDate.get(date);
    const total = bucket?.total ?? 0;
    const done = bucket?.done ?? 0;

    return {
      date,
      label: formatShortDay(parseDateKey(date), locale),
      total,
      done,
      // A day with nothing planned is a gap, not a 0% failure — otherwise an
      // empty weekend would read as a productivity crash.
      percent: total === 0 ? null : Math.round((done / total) * 100),
    };
  });
}

/* ------------------------------ productive hours ---------------------------- */

export type HourBucket = { hour: number; count: number };

/**
 * Completions per hour of the day, from `completedAt`.
 *
 * Tasks with no completion time are skipped rather than approximated from
 * `startTime`: scheduled time is not when the work actually happened, and
 * mixing the two would make the chart mean two different things at once.
 */
export function buildHourHistogram(tasks: LifeTask[]): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));

  for (const task of tasks) {
    if (task.status !== "done" || !task.completedAt) continue;

    buckets[task.completedAt.toDate().getHours()].count += 1;
  }

  return buckets;
}

/** True once at least one task carries a completion time. */
export function hasCompletionTimes(buckets: HourBucket[]): boolean {
  return buckets.some((bucket) => bucket.count > 0);
}

/** Localized label for an hour bucket, e.g. "6 AM" / "06:00". */
export function hourLabel(hour: number, locale: string): string {
  return formatTime(`${String(hour).padStart(2, "0")}:00`, locale);
}

/* --------------------------------- summary --------------------------------- */

export type TaskSummary = {
  total: number;
  done: number;
  /** 0 when nothing was planned in the window. */
  percent: number;
  /** Hour with the most completions, or `null` when there is no data yet. */
  peakHour: number | null;
  peakCount: number;
};

export function summarizeTasks(
  tasks: LifeTask[],
  buckets: HourBucket[],
): TaskSummary {
  // Same rule as the daily series: a dropped task is not a failure.
  const plan = tasksInPlan(tasks);
  const total = plan.length;
  const done = plan.filter((task) => task.status === "done").length;

  let peakHour: number | null = null;
  let peakCount = 0;

  for (const bucket of buckets) {
    if (bucket.count > peakCount) {
      peakCount = bucket.count;
      peakHour = bucket.hour;
    }
  }

  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    peakHour,
    peakCount,
  };
}

/* ---------------------------------- habits --------------------------------- */

export type HabitStreak = {
  id: string;
  name: string;
  /** Consecutive completed days ending today (or yesterday). */
  current: number;
  /** Longest run inside the loaded log window. */
  best: number;
  doneToday: boolean;
};

/** Current/best streak per active habit, strongest streak first. */
export function summarizeHabits(
  activeHabits: Habit[],
  doneDatesByHabit: Map<string, Set<string>>,
  today: string,
): HabitStreak[] {
  return activeHabits
    .map((habit) => {
      const dates = doneDatesByHabit.get(habit.id) ?? EMPTY_DATES;

      return {
        id: habit.id,
        name: habit.name,
        current: computeCurrentStreak(dates, today),
        best: computeBestStreak(dates),
        doneToday: dates.has(today),
      };
    })
    .sort(
      (a, b) =>
        b.current - a.current ||
        b.best - a.best ||
        a.name.localeCompare(b.name),
    );
}

/** True when there is something worth charting at all. */
export function hasAnyData(tasks: LifeTask[], activeHabits: Habit[]): boolean {
  return tasksInPlan(tasks).length > 0 || activeHabits.length > 0;
}
