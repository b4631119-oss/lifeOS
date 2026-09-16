import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dateKey,
  dayElapsedPercent,
  dayKeyFor,
  formatRelativeDay,
  isValidDateKey,
  msUntilNextLocalDay,
  nextDayKey,
  toMinutes,
  todayKey,
} from "./date.ts";

test("dateKey formats a local date as YYYY-MM-DD", () => {
  assert.equal(dateKey(new Date(2026, 8, 16, 13, 45)), "2026-09-16");
  assert.equal(dateKey(new Date(2026, 0, 1, 0, 0)), "2026-01-01");
  assert.equal(dateKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("todayKey is the date key of the passed moment", () => {
  const at = new Date(2026, 8, 16, 23, 59, 30);
  assert.equal(todayKey(at), "2026-09-16");
});

test("msUntilNextLocalDay counts down to the next local midnight", () => {
  assert.equal(msUntilNextLocalDay(new Date(2026, 8, 16, 23, 59, 30)), 30_000);
  assert.equal(msUntilNextLocalDay(new Date(2026, 8, 16, 0, 0, 0)), 86_400_000);
  assert.equal(
    msUntilNextLocalDay(new Date(2026, 8, 16, 12, 0, 0)),
    12 * 60 * 60 * 1000,
  );
});

test("waiting out the delay always lands on the next calendar day", () => {
  // The property the app relies on: the timer fires *in* the new day, so a
  // task created right then is dated tomorrow, not yesterday.
  const samples = [
    new Date(2026, 8, 16, 23, 59, 30),
    new Date(2026, 8, 16, 0, 0, 1),
    new Date(2026, 8, 16, 12, 30, 15),
    new Date(2026, 11, 31, 23, 59, 59),
    new Date(2026, 5, 30, 23, 0, 0),
  ];

  for (const now of samples) {
    const afterMidnight = new Date(now.getTime() + msUntilNextLocalDay(now));

    assert.notEqual(todayKey(afterMidnight), todayKey(now));
    assert.equal(todayKey(afterMidnight), dateKey(afterMidnight));
    assert.equal(afterMidnight.getHours(), 0);
    assert.equal(afterMidnight.getMinutes(), 0);
  }
});

test("the delay is always positive and under 25 hours", () => {
  for (let hour = 0; hour < 24; hour += 1) {
    const now = new Date(2026, 8, 16, hour, 0, 0);
    const delay = msUntilNextLocalDay(now);

    assert.ok(delay > 0, `delay at ${hour}:00 must be positive`);
    assert.ok(
      delay <= 25 * 60 * 60 * 1000,
      `delay at ${hour}:00 must be under 25h (got ${delay})`,
    );
  }
});

/* --------------------------------- day navigation -------------------------------- */

test("an offset of zero follows the calendar across midnight", () => {
  // The selected day is stored as an offset from today, so a tab left open
  // overnight shows the new day without any extra plumbing.
  assert.equal(dayKeyFor("2026-09-16", 0), "2026-09-16");
  assert.equal(dayKeyFor("2026-09-17", 0), "2026-09-17");
});

test("day navigation reaches yesterday, today and tomorrow, and beyond", () => {
  assert.equal(dayKeyFor("2026-09-16", -1), "2026-09-15");
  assert.equal(dayKeyFor("2026-09-16", 1), "2026-09-17");
  assert.equal(dayKeyFor("2026-09-01", -1), "2026-08-31");
  assert.equal(dayKeyFor("2026-01-01", -1), "2025-12-31");
  assert.equal(dayKeyFor("2026-12-31", 1), "2027-01-01");
});

test("nextDayKey crosses month and year boundaries", () => {
  assert.equal(nextDayKey("2026-09-16"), "2026-09-17");
  assert.equal(nextDayKey("2026-09-30"), "2026-10-01");
  assert.equal(nextDayKey("2026-12-31"), "2027-01-01");
});

test("isValidDateKey accepts real days only", () => {
  assert.equal(isValidDateKey("2026-09-16"), true);
  assert.equal(isValidDateKey("2026-02-30"), false);
  assert.equal(isValidDateKey("2026-13-01"), false);
  assert.equal(isValidDateKey("16.09.2026"), false);
  assert.equal(isValidDateKey(""), false);
});

test("formatRelativeDay names the neighbouring days", () => {
  const today = "2026-09-16";

  assert.equal(formatRelativeDay(today, today, "en"), "today");
  assert.equal(formatRelativeDay("2026-09-15", today, "en"), "yesterday");
  assert.equal(formatRelativeDay("2026-09-17", today, "en"), "tomorrow");
  assert.equal(formatRelativeDay("2026-09-20", today, "en"), "in 4 days");

  assert.equal(formatRelativeDay("2026-09-15", today, "ru"), "вчера");
  assert.equal(formatRelativeDay("2026-09-17", today, "ru"), "завтра");
});

/* ------------------------------------- clock ------------------------------------- */

test("toMinutes reads HH:mm and rejects everything else", () => {
  assert.equal(toMinutes("00:00"), 0);
  assert.equal(toMinutes("09:30"), 570);
  assert.equal(toMinutes("23:59"), 1439);
  // Some browsers report seconds on a time input.
  assert.equal(toMinutes("09:30:00"), 570);

  // An empty string means "unscheduled", not midnight.
  assert.equal(toMinutes(""), null);
  assert.equal(toMinutes("24:00"), null);
  assert.equal(toMinutes("09:60"), null);
  assert.equal(toMinutes("half past nine"), null);
});

test("the elapsed-day bar measures the plan, not the clock", () => {
  const at = new Date(2026, 8, 16, 12, 0);

  // Untimed tasks give the bar nothing to measure against.
  assert.equal(dayElapsedPercent([{ startTime: "", endTime: "" }], at), 0);
  assert.equal(dayElapsedPercent([], at), 0);

  // Half way through a 09:00–15:00 window.
  assert.equal(
    dayElapsedPercent([{ startTime: "09:00", endTime: "15:00" }], at),
    50,
  );
  // An unscheduled task must not be read as a 00:00 start.
  assert.equal(
    dayElapsedPercent(
      [
        { startTime: "09:00", endTime: "15:00" },
        { startTime: "", endTime: "" },
      ],
      at,
    ),
    50,
  );
});
