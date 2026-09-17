import type { LifeTask } from "@/types/lifeos";

/** Today's local date as `YYYY-MM-DD`. */
export function todayKey(date: Date = new Date()): string {
  return dateKey(date);
}

/**
 * Milliseconds from `now` until the next local midnight.
 *
 * The day is not a value that can be read once: a tab or an installed app left
 * open across 00:00 would otherwise keep writing to yesterday's documents (see
 * `useTodayKey`). This is the delay until the calendar day actually changes, so
 * a single timer can be scheduled per day instead of polling.
 *
 * Built through the local `Date` constructor rather than by adding 24 hours, so
 * a DST transition is handled by the platform: on the day the clock jumps, the
 * next local midnight is 23 or 25 hours away and the returned difference is the
 * real elapsed time either way.
 */
export function msUntilNextLocalDay(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  return nextMidnight.getTime() - now.getTime();
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
 * A compact day heading, e.g. "Mon, 21 Sep" / "пн, 21 сент.".
 *
 * Shorter on purpose than {@link formatDayLabel}, which is what a day control
 * prints: a page that is showing another day names that day in its heading
 * while the day navigation right below it prints the date in full, and two
 * identical lines in a row read as a mistake rather than as a title.
 */
export function formatDayHeading(key: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parseDateKey(key));
}

/**
 * How far through the scheduled day we are, as a percentage.
 *
 * Uses the scheduled window (earliest start -> latest end) when any task has a
 * time, otherwise falls back to the full 24 hour day. With no timed task at all
 * there is no schedule to measure against, so it reports 0 instead of the raw
 * time of day (which would show a non-zero bar on a day that has only
 * unscheduled tasks — the bar would then be measuring the clock, not the plan).
 */
export function dayElapsedPercent(
  tasks: Pick<LifeTask, "startTime" | "endTime">[],
  now: Date = new Date(),
): number {
  const starts = tasks
    .map((task) => toMinutes(task.startTime))
    .filter((value): value is number => value !== null);
  const ends = tasks
    .map((task) => toMinutes(task.endTime))
    .filter((value): value is number => value !== null);

  // Nothing is scheduled: no window to be through.
  if (starts.length === 0 && ends.length === 0) return 0;

  const windowStart = starts.length > 0 ? Math.min(...starts) : 0;
  const windowEnd = ends.length > 0 ? Math.max(...ends) : 24 * 60;

  if (windowEnd <= windowStart) return 0;

  const current = now.getHours() * 60 + now.getMinutes();
  const percent = ((current - windowStart) / (windowEnd - windowStart)) * 100;

  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * `"HH:mm"` (or `"HH:mm:ss"`) → minutes since midnight, or `null` when it is
 * not a time at all.
 *
 * Strict on purpose, and `null` for the empty string: since times became
 * optional, `""` is a real value meaning *unscheduled*, and the old
 * `split(":").map(Number)` read it as 0 — i.e. midnight, which silently put an
 * unscheduled task at 00:00 in the elapsed-day window.
 */
export function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Returns a new date shifted by `days` (negative shifts backwards). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The `YYYY-MM-DD` key of the day after `key`. */
export function nextDayKey(key: string): string {
  return dateKey(addDays(parseDateKey(key), 1));
}

/**
 * The day `offset` days away from `today`.
 *
 * Day navigation stores an *offset* rather than an absolute date, so an offset
 * of 0 keeps following the calendar: a tab left open across midnight shows the
 * new day instead of a date that has just turned into yesterday.
 */
export function dayKeyFor(today: string, offset: number): string {
  if (offset === 0) return today;
  return dateKey(addDays(parseDateKey(today), offset));
}

/**
 * The closed window of the last `days` days, ending on `today`.
 *
 * Exists as a pair of bounds rather than as a length because every read of the
 * task history has to *name its last day*: a range query with no upper bound on
 * `date` is a query for the user's entire future, which is what planning ahead
 * puts there. Both ends are inclusive, so `days: 1` is just today.
 */
export function recentDayRange(
  today: string,
  days: number,
): { from: string; to: string } {
  const span = Math.max(1, Math.floor(days));

  return { from: dayKeyFor(today, -(span - 1)), to: today };
}

/**
 * True for a well-formed `YYYY-MM-DD` key that names a real calendar day.
 *
 * Checked by round-tripping through `parseDateKey`, so impossible dates are
 * rejected too: the platform would happily turn "2026-02-30" into 2 March.
 */
export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return dateKey(parseDateKey(key)) === key;
}

/**
 * A localized, relative day label: "today", "yesterday", "in 3 days".
 *
 * `Intl.RelativeTimeFormat` supplies the wording *and* the plural rules in both
 * locales, so no message keys are needed for it. The day difference is rounded
 * rather than divided exactly, so a DST change (a 23 or 25 hour day) still
 * counts as one day.
 */
export function formatRelativeDay(
  key: string,
  today: string,
  locale?: string,
): string {
  const days = Math.round(
    (parseDateKey(key).getTime() - parseDateKey(today).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    days,
    "day",
  );
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

/**
 * A one-word weekday label, e.g. "Mon" / "пн".
 *
 * Used where a column has room for a label but not for a date: the habit
 * history cells print the weekday above the day number.
 */
export function formatWeekdayShort(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
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
