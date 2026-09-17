import assert from "node:assert/strict";
import { test } from "node:test";
import type { HabitLog } from "../types/lifeos.ts";
import { recentDayRange } from "./date.ts";
import {
  buildGridWeeks,
  clampHistoryOffset,
  computeBestStreak,
  computeCurrentStreak,
  habitLogAction,
  HISTORY_DAYS,
  historyDays,
  indexDoneDates,
  isMarkable,
  MIN_HISTORY_OFFSET,
  STREAK_LOOKBACK_DAYS,
} from "./habits.ts";

const TODAY = "2026-09-16";

function log(
  id: string,
  habitId: string,
  date: string,
  done: boolean,
): HabitLog {
  return { id, habitId, date, done };
}

test("today and earlier can be marked, tomorrow cannot", () => {
  assert.equal(isMarkable(TODAY, TODAY), true);
  assert.equal(isMarkable("2026-09-15", TODAY), true);
  assert.equal(isMarkable("2026-09-17", TODAY), false);
});

test("a day with no log gets one", () => {
  assert.deepEqual(habitLogAction([], "h1", "2026-09-15"), {
    type: "create",
    habitId: "h1",
    date: "2026-09-15",
  });
});

test("tapping a marked past day clears it", () => {
  const logs = [log("l1", "h1", "2026-09-15", true)];

  assert.deepEqual(habitLogAction(logs, "h1", "2026-09-15"), {
    type: "update",
    logId: "l1",
    done: false,
  });
});

test("tapping a cleared day marks it again", () => {
  const logs = [log("l1", "h1", "2026-09-15", false)];

  assert.deepEqual(habitLogAction(logs, "h1", "2026-09-15"), {
    type: "update",
    logId: "l1",
    done: true,
  });
});

test("a tap only ever touches the day it was made on", () => {
  // Regression: the toggle used to be hard-wired to today, so a cell for
  // yesterday wrote today's log.
  const logs = [
    log("today", "h1", TODAY, false),
    log("other", "h2", "2026-09-15", true),
  ];

  assert.deepEqual(habitLogAction(logs, "h1", "2026-09-15"), {
    type: "create",
    habitId: "h1",
    date: "2026-09-15",
  });
  assert.deepEqual(habitLogAction(logs, "h2", "2026-09-15"), {
    type: "update",
    logId: "other",
    done: false,
  });
});

test("one habit's log never answers for another habit", () => {
  const logs = [log("l1", "h2", "2026-09-15", true)];

  assert.deepEqual(habitLogAction(logs, "h1", "2026-09-15"), {
    type: "create",
    habitId: "h1",
    date: "2026-09-15",
  });
});

test("the strip cannot be scrolled forwards", () => {
  assert.equal(clampHistoryOffset(1), 0);
  assert.equal(clampHistoryOffset(0), 0);
  assert.equal(clampHistoryOffset(-1), -1);
});

test("the strip cannot be scrolled past the loaded history", () => {
  assert.equal(clampHistoryOffset(MIN_HISTORY_OFFSET - 5), MIN_HISTORY_OFFSET);
});

test("the current strip ends on today", () => {
  const days = historyDays(TODAY, 0);

  assert.equal(days.length, HISTORY_DAYS);
  assert.equal(days[days.length - 1], TODAY);
  assert.equal(days[0], "2026-09-10");
});

test("stepping back moves the whole strip one week at a time", () => {
  const days = historyDays(TODAY, -1);

  assert.equal(days.length, HISTORY_DAYS);
  assert.equal(days[days.length - 1], "2026-09-09");
  assert.ok(
    days.every((day) => day < TODAY),
    "a past strip may not contain today",
  );
});

test("every day the strip can show is inside the window that is read", () => {
  // The read is `recentDayRange(today, STREAK_LOOKBACK_DAYS)`: a day outside it
  // could not be shown, and marking it would write a log the page never loads.
  const window = recentDayRange(TODAY, STREAK_LOOKBACK_DAYS);
  const days = historyDays(TODAY, MIN_HISTORY_OFFSET);

  assert.ok(days[0] >= window.from, `${days[0]} < ${window.from}`);
  assert.ok(days[days.length - 1] <= window.to);
  assert.ok(HISTORY_DAYS <= STREAK_LOOKBACK_DAYS);
});

test("the same day never appears twice in a strip", () => {
  for (const offset of [0, -1, -12, MIN_HISTORY_OFFSET]) {
    const days = historyDays(TODAY, offset);
    assert.equal(new Set(days).size, HISTORY_DAYS);
  }
});

test("only completed logs become marked dates", () => {
  const index = indexDoneDates([
    log("l1", "h1", "2026-09-15", true),
    log("l2", "h1", "2026-09-14", false),
    log("l3", "h2", TODAY, true),
  ]);

  assert.deepEqual([...(index.get("h1") ?? [])], ["2026-09-15"]);
  assert.deepEqual([...(index.get("h2") ?? [])], [TODAY]);
});

test("a habit with no logs has no marked dates", () => {
  assert.equal(indexDoneDates([]).get("h1"), undefined);
});

test("the grid is seven days per column and padded to full weeks", () => {
  const dates = historyDays(TODAY, -1);
  const weeks = buildGridWeeks(dates);

  assert.ok(weeks.length >= 2);
  for (const week of weeks) assert.equal(week.length, 7);
  assert.deepEqual(weeks.flat().filter(Boolean).sort(), [...dates].sort());
});

test("an empty window builds no grid", () => {
  assert.deepEqual(buildGridWeeks([]), []);
});

test("a run ending yesterday still counts, a missed day resets it", () => {
  const done = new Set(["2026-09-15", "2026-09-14", "2026-09-13"]);

  assert.equal(computeCurrentStreak(done, TODAY), 3);
  assert.equal(computeCurrentStreak(new Set(["2026-09-13"]), TODAY), 0);
  assert.equal(computeCurrentStreak(new Set(), TODAY), 0);
});

test("the best streak is the longest run, wherever it sits", () => {
  const done = new Set([
    "2026-08-01",
    "2026-08-02",
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
  ]);

  assert.equal(computeBestStreak(done), 3);
  assert.equal(computeBestStreak(new Set()), 0);
});
