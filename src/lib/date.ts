import type { LifeTask } from "@/types/lifeos";

/** Today's local date as `YYYY-MM-DD`. */
export function todayKey(date: Date = new Date()): string {
  return dateKey(date);
}

/** Local calendar date as `YYYY-MM-DD` (matches the Firestore `date` field). */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "09:30" -> a localized time. Returns the raw value when it can't be parsed. */
export function formatTime(value: string, locale?: string): string {
  const minutes = toMinutes(value);
  if (minutes === null) return value;

  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "09:30" + "11:00" -> "9:30 AM – 11:00 AM". */
export function formatTimeRange(
  start: string,
  end: string,
  locale?: string,
): string {
  if (start && end) {
    return `${formatTime(start, locale)} – ${formatTime(end, locale)}`;
  }
  return formatTime(start || end, locale);
}

/** A full, localized day label, e.g. "Monday, 14 September 2026". */
export function formatDayLabel(
  date: Date = new Date(),
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * How far through the scheduled day we are, as a percentage.
 *
 * Uses the scheduled window (earliest start -> latest end) when any task has a
 * time, otherwise falls back to the full 24 hour day. With no tasks at all there
 * is no schedule to measure against, so it reports 0 instead of the raw time of
 * day (which would show a non-zero bar on an empty day).
 */
export function dayElapsedPercent(
  tasks: Pick<LifeTask, "startTime" | "endTime">[],
  now: Date = new Date(),
): number {
  if (tasks.length === 0) return 0;

  const starts = tasks
    .map((task) => toMinutes(task.startTime))
    .filter((value): value is number => value !== null);
  const ends = tasks
    .map((task) => toMinutes(task.endTime))
    .filter((value): value is number => value !== null);

  const windowStart = starts.length > 0 ? Math.min(...starts) : 0;
  const windowEnd = ends.length > 0 ? Math.max(...ends) : 24 * 60;

  if (windowEnd <= windowStart) return 0;

  const current = now.getHours() * 60 + now.getMinutes();
  const percent = ((current - windowStart) / (windowEnd - windowStart)) * 100;

  return Math.min(100, Math.max(0, Math.round(percent)));
}

function toMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/** Returns a new date shifted by `days` (negative shifts backwards). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Parses a `YYYY-MM-DD` key into a local Date at midnight. */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** True when `next` is the local calendar day right after `previous`. */
export function isNextDay(previous: string, next: string): boolean {
  return dateKey(addDays(parseDateKey(previous), 1)) === next;
}

/** A short, localized day label, e.g. "14 Sep". */
export function formatShortDay(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * A row label for a past day, e.g. "Mon, 14 Sep 2026".
 *
 * Carries the year (unlike {@link formatShortDay}) because this is used to scan
 * a history that can reach back past the current year.
 */
export function formatHistoryDate(key: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDateKey(key));
}

/** A localized wall-clock time, e.g. "9:40 PM". */
export function formatClock(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
