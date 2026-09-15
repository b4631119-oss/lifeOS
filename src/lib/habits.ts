import { dateKey, isNextDay, parseDateKey, addDays } from "@/lib/date";
import type { HabitLog } from "@/types/lifeos";

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
