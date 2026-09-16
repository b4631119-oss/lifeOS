import type { LifeTask } from "@/types/lifeos";

import { addDays, dateKey, parseDateKey } from "./date.ts";
import {
  compareDayTasks,
  isScheduled,
  plannedMinutes,
  tasksInPlan,
} from "./taskSchedule.ts";

/**
 * The week, as plain functions over the days that already exist.
 *
 * There is no `WeeklyTask` and no week document anywhere: a week is a *view* of
 * the tasks the user already has, so nothing has to be kept in step with them
 * and nothing can drift. Everything here is pure — no React, no Firebase — so
 * the date maths and the review numbers can be reasoned about (and tested) on
 * their own, the same way `lib/taskSchedule.ts` holds the day's rules.
 */

/** Seven days. Not a constant to be changed — a week is a week. */
export const WEEK_LENGTH = 7;

/** ISO weekday number: 1 = Monday … 7 = Sunday. */
export type WeekStart = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Which day a week begins on, for a locale.
 *
 * Asked of the platform (`Intl.Locale.weekInfo`) rather than hard-coded, so
 * Russian weeks run Monday → Sunday and English ones Sunday → Saturday, and a
 * locale added later brings its own convention with it. The fallback is only
 * for runtimes without `weekInfo` (older browsers): it keeps the two locales
 * this app ships with correct, and treats anything unknown as ISO (Monday).
 */
export function weekStartsOnFor(locale: string): WeekStart {
  const fromPlatform = platformWeekStart(locale);
  if (fromPlatform !== null) return fromPlatform;

  return locale.toLowerCase().startsWith("en") ? 7 : 1;
}

/**
 * The slice of `Intl.Locale` this needs.
 *
 * `weekInfo` is newer than the TypeScript lib this project compiles against, so
 * it is described here rather than read through a cast at the call site.
 */
type LocaleWithWeekInfo = {
  weekInfo?: { firstDay?: number };
  /** The earlier spelling: it used to be an accessor method, not a property. */
  getWeekInfo?: () => { firstDay?: number };
};

function platformWeekStart(locale: string): WeekStart | null {
  try {
    const resolved = new Intl.Locale(locale) as unknown as LocaleWithWeekInfo;
    const firstDay = (resolved.weekInfo ?? resolved.getWeekInfo?.())?.firstDay;

    if (typeof firstDay === "number" && firstDay >= 1 && firstDay <= 7) {
      return firstDay as WeekStart;
    }
  } catch {
    // A locale the runtime cannot parse must not break a page — fall through to
    // the small fallback below.
  }

  return null;
}

/** The day-of-week of a key, as ISO 1 (Monday) … 7 (Sunday). */
function isoWeekday(key: string): WeekStart {
  const sundayFirst = parseDateKey(key).getDay();
  return (sundayFirst === 0 ? 7 : sundayFirst) as WeekStart;
}

/** The first day of the week `key` falls in. */
export function startOfWeekKey(key: string, weekStartsOn: WeekStart): string {
  const behind = (isoWeekday(key) - weekStartsOn + WEEK_LENGTH) % WEEK_LENGTH;
  return dateKey(addDays(parseDateKey(key), -behind));
}

/**
 * The seven days of a week, oldest first, from its first day.
 *
 * Built by stepping the calendar rather than by arithmetic on the key, so a
 * month or year boundary is just another day (and a DST change cannot shift it).
 */
export function weekDayKeys(startKey: string): string[] {
  const first = parseDateKey(startKey);

  return Array.from({ length: WEEK_LENGTH }, (_, index) =>
    dateKey(addDays(first, index)),
  );
}

/**
 * The first day of the week `offset` weeks from `today`'s own week.
 *
 * An offset rather than an absolute date, for the same reason the day
 * navigation stores one: an offset of 0 keeps following the calendar, so a tab
 * left open over the weekend shows the new week instead of the old one.
 */
export function weekStartFor(
  today: string,
  offset: number,
  weekStartsOn: WeekStart,
): string {
  const current = startOfWeekKey(today, weekStartsOn);
  if (offset === 0) return current;

  return dateKey(addDays(parseDateKey(current), offset * WEEK_LENGTH));
}

/**
 * Signed distance in days from `today` to `date` — what `DayContext` stores.
 *
 * Rounded rather than divided exactly so a DST change still counts as one day.
 * This is the bridge between "open this day" and the day navigation that
 * already exists: the Week view asks for a *date*, and Today and the Schedule
 * keep working in offsets, exactly as they were built.
 */
export function dayOffsetFor(today: string, date: string): number {
  return Math.round(
    (parseDateKey(date).getTime() - parseDateKey(today).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

/**
 * A localized label for a whole week, e.g. "14 – 20 September 2026" / "14 – 20
 * сентября 2026 г.".
 *
 * `formatRange` collapses what the two ends share (the month and the year), so
 * the header stays readable instead of printing both dates in full. It is also
 * where the week's own convention shows up in the wording: a Russian week reads
 * 14 → 20 September, an English one 13 → 19 September.
 */
export function formatWeekRange(startKey: string, locale?: string): string {
  const days = weekDayKeys(startKey);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatter.formatRange(
    parseDateKey(days[0]),
    parseDateKey(days[WEEK_LENGTH - 1]),
  );
}

/**
 * Where a week sits relative to now, in the reader's own words: "this week",
 * "next week", "2 weeks ago".
 *
 * `Intl.RelativeTimeFormat` supplies the wording and the plural rules in both
 * languages, so the week header needs no message keys of its own — the same
 * approach the day navigation already takes with `formatRelativeDay`.
 */
export function formatRelativeWeek(offset: number, locale?: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    offset,
    "week",
  );
}

/** The weekday of a key on its own, e.g. "Monday" / "понедельник". */
export function formatWeekday(key: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
    parseDateKey(key),
  );
}

/* ------------------------------ task grouping ------------------------------- */

export type WeekDayBucket = {
  /** `YYYY-MM-DD` */
  date: string;
  tasks: LifeTask[];
};

/**
 * The week's tasks split into its days, every day present.
 *
 * Days with nothing planned are kept as empty buckets rather than dropped: the
 * Week view has to *show* Thursday as empty, which is information, and a grid
 * whose shape changed with the data would be unreadable.
 *
 * Tasks dated outside the week are ignored, so a stray document cannot appear
 * in a week it does not belong to.
 */
export function weekDayBuckets(
  tasks: LifeTask[],
  dayKeys: string[],
): WeekDayBucket[] {
  const wanted = new Set(dayKeys);
  const byDate = new Map<string, LifeTask[]>(dayKeys.map((date) => [date, []]));

  for (const task of tasks) {
    if (!wanted.has(task.date)) continue;
    byDate.get(task.date)?.push(task);
  }

  return dayKeys.map((date) => ({
    date,
    tasks: (byDate.get(date) ?? []).sort(compareDayTasks),
  }));
}

/* ---------------------------------- review ---------------------------------- */

export type WeekSummary = {
  /** Tasks planned for the week, excluding the ones taken off the plan. */
  planned: number;
  /** Of those, marked done. */
  completed: number;
  /**
   * Of those, still open *and* dated before today — the work a decision is owed
   * on. Today's own tasks are not "unfinished": the day is not over.
   */
  unfinished: number;
  /** Open work dated today or later — anything still to come. */
  upcoming: number;
  /** Taken off the plan deliberately: neither a success nor a failure. */
  dropped: number;
  /** Planned tasks with a time on them, and the ones without. */
  scheduled: number;
  unscheduled: number;
  /** Total length of the week's scheduled tasks, in minutes. */
  plannedMinutes: number;
  /** Planned tasks linked to a goal. */
  goalLinked: number;
  /** `completed + unfinished`: what the week was meant to deliver by now. */
  due: number;
  /** `completed` of `due`, or `null` when nothing was due yet. */
  completionPercent: number | null;
};

/**
 * What actually happened in a week, counted from its tasks.
 *
 * There is no stored review document and no score: every number is a count of
 * the tasks in the week, so it can never disagree with the work itself. Nothing
 * is invented for the parts the data cannot answer — with nothing due yet the
 * completion percentage is `null` rather than 0%, and no "available capacity"
 * of any kind is estimated (see the planned-minutes note in
 * `lib/taskSchedule.ts`).
 *
 * `today` is a parameter because "unfinished" depends on where the week sits
 * relative to now: a past week can be entirely open, a future week has nothing
 * unfinished at all.
 */
export function summarizeWeek(
  tasks: LifeTask[],
  dayKeys: string[],
  today: string,
): WeekSummary {
  const wanted = new Set(dayKeys);
  const inWeek = tasks.filter((task) => wanted.has(task.date));
  // A dropped task was taken off the plan, so it is not part of the week's
  // delivery and must not sit in the denominator — the same rule the day's
  // metrics and the Analytics page already follow.
  const plan = tasksInPlan(inWeek);

  let completed = 0;
  let unfinished = 0;
  let upcoming = 0;

  for (const task of plan) {
    if (task.status === "done") {
      completed += 1;
    } else if (task.date < today) {
      unfinished += 1;
    } else {
      upcoming += 1;
    }
  }

  const due = completed + unfinished;

  return {
    planned: plan.length,
    completed,
    unfinished,
    upcoming,
    dropped: inWeek.length - plan.length,
    scheduled: plan.filter(isScheduled).length,
    unscheduled: plan.filter((task) => !isScheduled(task)).length,
    plannedMinutes: plannedMinutes(plan),
    goalLinked: plan.filter((task) => Boolean(task.goalId)).length,
    due,
    completionPercent: due === 0 ? null : Math.round((completed / due) * 100),
  };
}
