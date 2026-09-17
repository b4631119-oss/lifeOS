import type { HabitLog } from "@/types/lifeos";

// Relative, like every other module in `lib/`: `npm test` runs these files
// through Node's own resolver, which does not know the `@/` alias.
import {
  addDays,
  dateKey,
  isNextDay,
  parseDateKey,
  recentDayRange,
} from "./date.ts";

/** Activity grid length, in weeks. */
export const GRID_WEEKS = 12;

/** Activity grid length, in days (12 weeks). */
export const GRID_DAYS = GRID_WEEKS * 7;

/**
 * How far back we load logs. Caps the "best streak" lookback so we never read
 * the user's entire history.
 */
export const STREAK_LOOKBACK_DAYS = 365;

/** Stable empty set, so habits without logs keep a stable reference. */
export const EMPTY_DATES: ReadonlySet<string> = new Set<string>();

/** Days the interactive history strip shows at a time. */
export const HISTORY_DAYS = 7;

/**
 * How far back the strip can be scrolled, in whole strips.
 *
 * Bounded by what is actually loaded: a day that has not been read cannot be
 * shown, and it must never be *written* to either (a check-in for a day the user
 * cannot see would be a log that appears from nowhere).
 */
export const MIN_HISTORY_OFFSET = -Math.floor(
  (STREAK_LOOKBACK_DAYS - HISTORY_DAYS) / HISTORY_DAYS,
);

/** habitId -> set of `YYYY-MM-DD` dates where the habit was completed. */
export function indexDoneDates(logs: HabitLog[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const log of logs) {
    if (!log.done) continue;

    const dates = index.get(log.habitId) ?? new Set<string>();
    dates.add(log.date);
    index.set(log.habitId, dates);
  }

  return index;
}

/**
 * Whether a day can still be marked off.
 *
 * Today and every earlier day: a habit is something that happened, so there is
 * nothing to check in for tomorrow. Compared as `YYYY-MM-DD` strings, which sort
 * chronologically — no date arithmetic, and no timezone to get wrong.
 */
export function isMarkable(date: string, today: string): boolean {
  return date <= today;
}

/** What a tap on one day's cell means. */
export type HabitLogAction =
  | { type: "create"; habitId: string; date: string }
  | { type: "update"; logId: string; done: boolean };

/**
 * The write a cell tap performs: one log per habit per day, so an existing row is
 * flipped and a missing one is created. Modelled as a value rather than as an
 * `if` inside the click handler, because "toggle" for *any* day is exactly the
 * logic that used to be hard-wired to today.
 */
export function habitLogAction(
  logs: HabitLog[],
  habitId: string,
  date: string,
): HabitLogAction {
  const existing = logs.find(
    (log) => log.habitId === habitId && log.date === date,
  );

  if (!existing) return { type: "create", habitId, date };

  return { type: "update", logId: existing.id, done: !existing.done };
}

/** `weekOffset` clamped to what the loaded history can actually show. */
export function clampHistoryOffset(weekOffset: number): number {
  if (!Number.isFinite(weekOffset)) return 0;

  return Math.min(0, Math.max(MIN_HISTORY_OFFSET, Math.trunc(weekOffset)));
}

/**
 * The day window the strip shows, oldest first.
 *
 * Offset 0 ends on today, so the current strip always contains today and never
 * a day that has not happened yet; negative offsets step back a strip at a time.
 */
export function historyDays(today: string, weekOffset: number): string[] {
  const offset = clampHistoryOffset(weekOffset);
  const end =
    offset === 0
      ? today
      : dateKey(addDays(parseDateKey(today), offset * HISTORY_DAYS));

  const { from } = recentDayRange(end, HISTORY_DAYS);
  const start = parseDateKey(from);

  return Array.from({ length: HISTORY_DAYS }, (_, index) =>
    dateKey(addDays(start, index)),
  );
}

/**
 * Groups day keys into columns of seven (Sunday first), padding the first and
 * last week so every column has a full set of cells.
 */
export function buildGridWeeks(dates: string[]): (string | null)[][] {
  if (dates.length === 0) return [];

  // Sunday-first offset for the first day in the window.
  const offset = parseDateKey(dates[0]).getDay();

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...dates,
  ];

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) {
    lastWeek.push(null);
  }

  return weeks;
}

/**
 * Current streak: consecutive completed days ending today.
 *
 * Today still being in progress does not break the run — the streak also
 * counts a run ending yesterday, and only resets once a full day is missed.
 */
export function computeCurrentStreak(
  doneDates: ReadonlySet<string>,
  today: string,
): number {
  let cursor = parseDateKey(today);

  if (!doneDates.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!doneDates.has(dateKey(cursor))) return 0;
  }

  let streak = 0;
  while (doneDates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** Longest run of consecutive completed days in the loaded window. */
export function computeBestStreak(doneDates: ReadonlySet<string>): number {
  const sorted = [...doneDates].sort();

  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of sorted) {
    run = previous !== null && isNextDay(previous, date) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  return best;
}
