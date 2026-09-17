import type { Goal, GoalStatus, Habit, LifeTask } from "@/types/lifeos";

import {
  addDays,
  dateKey,
  formatShortDay,
  formatTime,
  parseDateKey,
} from "./date.ts";
import { goalStatusOf } from "./goals.ts";
import { computeBestStreak, computeCurrentStreak, EMPTY_DATES } from "./habits.ts";
import { isScheduled, tasksInPlan } from "./taskSchedule.ts";

/**
 * Pure aggregation for the analytics page.
 *
 * Everything here is a plain function over already-loaded data — no Firebase,
 * no React — so the maths can be reasoned about (and tested) on its own, the
 * same way `lib/habits.ts` holds the streak rules for the habits module.
 *
 * The module answers four separate questions and never mixes them:
 *
 *  - *Captured* — how much was written down in the window (dropped included).
 *  - *Planned* — how much of it is work the window commits to: everything dated
 *    that was not taken off the plan. Assigning a task to a day *is* planning
 *    in LifeOS, so work with no hour is planned work; the hour is detail inside
 *    the plan, not the thing that creates it. This is the denominator of the
 *    completion figure.
 *  - *With a time* — how much of the planned work was also put on the clock.
 *    A separate question, and the reason `timed` is never used as a stand-in
 *    for `planned`.
 *  - *Completed* — how much of the plan is done.
 *
 * The point of the split is the capture-first path: writing a thought down is
 * free, so a figure that divides by it would score the user's thinking rather
 * than their follow-through. Both halves stay visible — volume above, the rate
 * over real commitments — and the rate is never named "productivity".
 *
 * The imports are relative on purpose: `npm test` runs these modules through
 * Node's own resolver, which does not know the `@/` alias.
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

/* --------------------------------- summary --------------------------------- */

export type WindowSummary = {
  /** Every task dated in the window — what was written down, dropped included. */
  captured: number;
  /**
   * The work the window commits to: every dated task except the ones taken off
   * the plan.
   *
   * A day is a commitment on its own in LifeOS — capturing a task onto a day
   * puts it in that day's plan, and `Add to this day` in the Week is planning,
   * not a half-step — so a task with no time is still planned work. Having an
   * exact hour is *detail inside* the plan, never the thing that makes a plan
   * exist; that is why the completion figure below divides by this, and why
   * `timed` is reported separately instead of standing in for it.
   */
  planned: number;
  /** Of those, the ones with a slot on the clock. */
  timed: number;
  /** Of those, the ones with no time — the day's backlog, still planned. */
  untimed: number;
  /** Planned tasks marked done. */
  completed: number;
  /** Taken off the plan: part of `captured`, part of no completion figure. */
  dropped: number;
  /**
   * `completed / planned` as 0–100, or `null` when nothing is planned.
   *
   * `null` rather than 0 on purpose: an empty denominator is not a failure, and
   * printing 0% for a window that holds no commitment would read as one. The
   * captures are counted above regardless, so a window of unfiled thoughts
   * still shows its volume without being scored on it.
   */
  completionPercent: number | null;
};

/**
 * The window's numbers, counted from its tasks.
 *
 * Dropped tasks are left out of the plan and of every completion figure, but
 * kept in the captured count: taking a task off the plan does not unwrite it,
 * and counting it as either a success or a failure would give the recovery flow
 * a cost it is not supposed to have.
 */
export function summarizeWindow(tasks: LifeTask[]): WindowSummary {
  const captured = tasks.length;
  const plan = tasksInPlan(tasks);
  const timed = plan.filter(isScheduled);
  const completed = plan.filter((task) => task.status === "done").length;

  return {
    captured,
    planned: plan.length,
    timed: timed.length,
    untimed: plan.length - timed.length,
    completed,
    dropped: captured - plan.length,
    completionPercent:
      plan.length === 0
        ? null
        : Math.round((completed / plan.length) * 100),
  };
}

/* ------------------------------ day breakdown ------------------------------- */

export type DailySummary = {
  /** `YYYY-MM-DD` */
  date: string;
  /** Localized short day label, e.g. "14 Sep". */
  label: string;
  /** The day's plan: dated and not dropped. Untimed work is included. */
  planned: number;
  /** Of those, the ones with a time on them. */
  timed: number;
  /** Of those, marked done. */
  completed: number;
};

/**
 * One row per day of the window, oldest first, every day present.
 *
 * The same three counts the headline uses, per day — `planned` (not `timed`) is
 * the day's plan, so the page and its breakdown cannot end up speaking two
 * different languages. Deliberately counts rather than a percentage: a day with
 * two tasks would put a 50% swing behind a single checkbox, which is not a trend
 * and should not be drawn as one. Counts can be checked against the tasks
 * themselves, which is what makes the pooled figures above inspectable.
 */
export function buildDailySummaries(
  tasks: LifeTask[],
  days: number,
  locale: string,
  now: Date = new Date(),
): DailySummary[] {
  const byDate = new Map<string, DailySummary>();

  for (const date of recentDayKeys(days, now)) {
    byDate.set(date, {
      date,
      label: formatShortDay(parseDateKey(date), locale),
      planned: 0,
      timed: 0,
      completed: 0,
    });
  }

  for (const task of tasks) {
    const bucket = byDate.get(task.date);
    if (!bucket) continue;

    // Dropped work is off the day's plan, exactly as it is off the window's.
    if (task.dropped) continue;

    bucket.planned += 1;
    if (isScheduled(task)) bucket.timed += 1;
    if (task.status === "done") bucket.completed += 1;
  }

  return [...byDate.values()];
}

/* ------------------------------ completion hours ---------------------------- */

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

/**
 * How many completions carry a time — the sample size behind the hour figure.
 *
 * A completion time is only recorded from the moment the field existed, so this
 * is always a count of *known* completions, not of all of them.
 */
export function completionSamples(buckets: HourBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.count, 0);
}

/**
 * Fewest completions with a time before an hour is claimed at all.
 *
 * Five is a product decision, not a statistical one: with two or three marks on
 * the clock every hour is a single event, and naming one of them "when you
 * finish work" would dress up noise as a routine. Below the threshold the page
 * says so and shows nothing instead.
 */
export const MIN_HOUR_SAMPLES = 5;

export type HourInsight =
  | { kind: "insufficient"; samples: number; needed: number }
  | { kind: "spread"; samples: number }
  | { kind: "peak"; hour: number; count: number; samples: number };

/**
 * What, if anything, the completion times actually show.
 *
 * Two ways of saying "nothing": too few completions to look at, and completions
 * spread so thinly that no hour holds a pattern. The second needs the peak to
 * hold at least two completions — otherwise the strongest bucket is just the
 * earliest completion, and pointing at it would invent a habit.
 */
export function hourInsight(buckets: HourBucket[]): HourInsight {
  const samples = completionSamples(buckets);

  if (samples < MIN_HOUR_SAMPLES) {
    return { kind: "insufficient", samples, needed: MIN_HOUR_SAMPLES };
  }

  const peak = buckets.reduce<HourBucket | null>(
    (current, bucket) =>
      bucket.count > (current?.count ?? 0) ? bucket : current,
    null,
  );

  if (!peak || peak.count < 2) return { kind: "spread", samples };

  return { kind: "peak", hour: peak.hour, count: peak.count, samples };
}

/** Localized label for an hour bucket, e.g. "6 AM" / "06:00". */
export function hourLabel(hour: number, locale: string): string {
  return formatTime(`${String(hour).padStart(2, "0")}:00`, locale);
}

/* ---------------------------------- goals ----------------------------------- */

export type GoalWork = {
  id: string;
  title: string;
  status: GoalStatus;
  /** Linked tasks on the plan inside the window. */
  planned: number;
  /** Of those, marked done. */
  completed: number;
};

/**
 * The window's work, grouped by the goal it belongs to.
 *
 * Reading only: a task's `goalId` is the single link that exists, so a goal
 * appears here exactly when real work for it happened in the window. A link to
 * a goal that has since been deleted is skipped rather than renamed — there is
 * no title left to show, and the task itself is untouched.
 *
 * A goal keeps its own status, so finished or archived ones are labelled as
 * such: having work in the window must not quietly reopen a goal the user
 * closed. Tasks with no goal are absent by design — the page answers "which
 * goals moved", not "why has this task no goal".
 */
export function summarizeGoals(
  tasks: LifeTask[],
  goals: Goal[],
): GoalWork[] {
  const byId = new Map(goals.map((goal) => [goal.id, goal]));
  const work = new Map<string, GoalWork>();

  for (const task of tasksInPlan(tasks)) {
    if (!task.goalId) continue;

    const goal = byId.get(task.goalId);
    if (!goal) continue;

    const row =
      work.get(goal.id) ??
      ({
        id: goal.id,
        title: goal.title,
        status: goalStatusOf(goal),
        planned: 0,
        completed: 0,
      } satisfies GoalWork);

    row.planned += 1;
    if (task.status === "done") row.completed += 1;
    work.set(goal.id, row);
  }

  return [...work.values()].sort(
    (a, b) =>
      b.completed - a.completed ||
      b.planned - a.planned ||
      a.title.localeCompare(b.title),
  );
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

/* ---------------------------------- report --------------------------------- */

export type AnalyticsReport = {
  days: RangeDays;
  /** Inclusive ends of the window, as `YYYY-MM-DD` keys. */
  range: { from: string; to: string };
  summary: WindowSummary;
  daily: DailySummary[];
  buckets: HourBucket[];
  insight: HourInsight;
  goals: GoalWork[];
  streaks: HabitStreak[];
  /** False when the selected window holds no task at all. */
  hasWindowTasks: boolean;
};

export type AnalyticsReportInput = {
  /** Tasks from the widest loaded window; the report slices the last `days`. */
  tasks: LifeTask[];
  goals: Goal[];
  activeHabits: Habit[];
  doneDatesByHabit: Map<string, Set<string>>;
  /** `YYYY-MM-DD` — the window ends here, and every other date is derived. */
  today: string;
  days: RangeDays;
  locale: string;
};

/**
 * Everything the analytics page shows, derived in one pass.
 *
 * A single entry point rather than a handful of calls at the call site: the
 * figures on the page have to agree with each other (the same window, the same
 * task basis, the same "today"), and the surest way to keep them agreeing is to
 * compute them together and hand the view a finished report. It is also what
 * makes the page testable without Firebase — see `analytics.test.ts`.
 *
 * `now` is derived from `today` rather than read from the clock, so a render
 * cannot straddle midnight and count the same task as both inside and outside
 * the window.
 */
export function buildAnalyticsReport(
  input: AnalyticsReportInput,
): AnalyticsReport {
  const { tasks, goals, activeHabits, doneDatesByHabit, today, days, locale } =
    input;

  const now = parseDateKey(today);
  const windowTasks = tasksWithinDays(tasks, days, now);
  const buckets = buildHourHistogram(windowTasks);
  const window = recentDayKeys(days, now);

  return {
    days,
    range: { from: window[0], to: window[window.length - 1] },
    summary: summarizeWindow(windowTasks),
    daily: buildDailySummaries(windowTasks, days, locale, now),
    buckets,
    insight: hourInsight(buckets),
    goals: summarizeGoals(windowTasks, goals),
    streaks: summarizeHabits(activeHabits, doneDatesByHabit, today),
    hasWindowTasks: windowTasks.length > 0,
  };
}
