import assert from "node:assert/strict";
import { test } from "node:test";

import type { LifeTask } from "@/types/lifeos";

import { taskPatch } from "./taskPatch.ts";
import {
  dayOffsetFor,
  formatRelativeWeek,
  formatWeekday,
  formatWeekRange,
  startOfWeekKey,
  summarizeWeek,
  weekDayBuckets,
  weekDayKeys,
  weekStartFor,
  weekStartsOnFor,
} from "./week.ts";

/** Wednesday. */
const TODAY = "2026-09-16";
/** Monday — the first day of the Monday-start week that holds `TODAY`. */
const WEEK_START = "2026-09-14";
/** Sunday — the last day of that same week. */
const WEEK_END = "2026-09-20";
/** Sunday — the first day of the Sunday-start week that holds `TODAY`. */
const EN_WEEK_START = "2026-09-13";

const MONDAY = 1 as const;
const SUNDAY = 7 as const;

function task(
  overrides: Partial<LifeTask> & Pick<LifeTask, "id" | "title" | "date">,
): LifeTask {
  return {
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
    createdAt: null,
    ...overrides,
  };
}

/* ------------------------------- which day first ----------------------------- */

test("the week starts on the day the locale says it does", () => {
  // Asked of the platform, so the two locales the app ships with differ the way
  // their calendars do: Russian runs Monday → Sunday, English Sunday → Saturday.
  assert.equal(weekStartsOnFor("ru"), MONDAY);
  assert.equal(weekStartsOnFor("ru-RU"), MONDAY);
  assert.equal(weekStartsOnFor("en"), SUNDAY);
  assert.equal(weekStartsOnFor("en-US"), SUNDAY);
  assert.equal(weekStartsOnFor("en-GB"), MONDAY);

  // Nothing recognisable: ISO (Monday) rather than a crash or a NaN.
  assert.equal(weekStartsOnFor(""), MONDAY);
  assert.equal(weekStartsOnFor("not a locale"), MONDAY);
});

/* -------------------------------- week bounds -------------------------------- */

test("a Monday-start week runs Monday → Sunday", () => {
  assert.equal(startOfWeekKey(TODAY, MONDAY), WEEK_START);
  // The first day is its own start…
  assert.equal(startOfWeekKey(WEEK_START, MONDAY), WEEK_START);
  // …and the last day still belongs to the week that began six days earlier.
  assert.equal(startOfWeekKey(WEEK_END, MONDAY), WEEK_START);
  assert.equal(startOfWeekKey("2026-09-21", MONDAY), "2026-09-21");
});

test("a Sunday-start week runs Sunday → Saturday", () => {
  assert.equal(startOfWeekKey(TODAY, SUNDAY), EN_WEEK_START);
  assert.equal(startOfWeekKey(EN_WEEK_START, SUNDAY), EN_WEEK_START);
  assert.equal(startOfWeekKey("2026-09-19", SUNDAY), EN_WEEK_START);
  assert.equal(startOfWeekKey(WEEK_END, SUNDAY), WEEK_END);
});

test("week boundaries cross months and years", () => {
  // 2026-10-01 is a Thursday, so its Monday-start week begins 28 September.
  assert.equal(startOfWeekKey("2026-10-01", MONDAY), "2026-09-28");
  // 2027-01-01 is a Friday; that week began on 28 December 2026.
  assert.equal(startOfWeekKey("2027-01-01", MONDAY), "2026-12-28");
  // 2026-03-01 is a Sunday and starts its own Sunday-first week.
  assert.equal(startOfWeekKey("2026-03-01", SUNDAY), "2026-03-01");
  assert.equal(startOfWeekKey("2026-02-28", SUNDAY), "2026-02-22");
});

test("the seven days of a week follow the calendar across a month boundary", () => {
  const days = weekDayKeys("2026-09-28");

  assert.equal(days.length, 7);
  assert.equal(days[0], "2026-09-28");
  assert.equal(days[6], "2026-10-04");
  assert.deepEqual(days, [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ]);
});

test("the days of a week are unique and consecutive", () => {
  for (const start of ["2026-09-14", "2026-12-28", "2027-01-04"]) {
    const days = weekDayKeys(start);

    assert.equal(new Set(days).size, 7);
    assert.equal(days.length, 7);
  }
});

test("week navigation moves whole weeks, and offset zero follows the calendar", () => {
  // The offset is relative to today's own week, so a tab left open over the
  // weekend shows the new week rather than the one it was opened on.
  assert.equal(weekStartFor(TODAY, 0, MONDAY), WEEK_START);
  assert.equal(weekStartFor(WEEK_END, 0, MONDAY), WEEK_START);
  assert.equal(weekStartFor("2026-09-21", 0, MONDAY), "2026-09-21");

  assert.equal(weekStartFor(TODAY, 1, MONDAY), "2026-09-21");
  assert.equal(weekStartFor(TODAY, -1, MONDAY), "2026-09-07");

  // Across the year boundary in both directions.
  assert.equal(weekStartFor("2026-12-31", 0, MONDAY), "2026-12-28");
  assert.equal(weekStartFor("2026-12-31", 1, MONDAY), "2027-01-04");
  assert.equal(weekStartFor("2026-12-31", -1, MONDAY), "2026-12-21");
});

test("a week labels both of its ends, in the reader's language", () => {
  const russian = formatWeekRange(WEEK_START, "ru");
  const english = formatWeekRange(WEEK_START, "en");

  for (const label of [russian, english]) {
    assert.ok(label.includes("14"), `missing the first day in "${label}"`);
    assert.ok(label.includes("20"), `missing the last day in "${label}"`);
    assert.ok(label.includes("2026"), `missing the year in "${label}"`);
  }

  // The language actually changes the wording, and a locale-less call still
  // produces a label rather than throwing on a missing locale.
  assert.notEqual(russian, english);
  assert.ok(formatWeekRange(WEEK_START).length > 0);
});

test("a week says where it sits relative to now", () => {
  assert.equal(formatRelativeWeek(0, "en"), "this week");
  assert.equal(formatRelativeWeek(1, "en"), "next week");
  assert.equal(formatRelativeWeek(-1, "en"), "last week");

  assert.equal(formatRelativeWeek(0, "ru"), "на этой неделе");
  assert.equal(formatRelativeWeek(1, "ru"), "на следующей неделе");
  assert.equal(formatRelativeWeek(-1, "ru"), "на прошлой неделе");
});

test("a day of the week is named in the reader's language", () => {
  assert.equal(formatWeekday(WEEK_START, "en"), "Monday");
  assert.equal(formatWeekday(WEEK_START, "ru"), "понедельник");
  assert.equal(formatWeekday(WEEK_END, "en"), "Sunday");
});

/* ------------------------------ day navigation -------------------------------- */

test("a date becomes an offset from today", () => {
  // This is the bridge to the existing day navigation: the Week view names a
  // date, and Today keeps working in offsets.
  assert.equal(dayOffsetFor(TODAY, TODAY), 0);
  assert.equal(dayOffsetFor(TODAY, WEEK_START), -2);
  assert.equal(dayOffsetFor(TODAY, WEEK_END), 4);
  assert.equal(dayOffsetFor(TODAY, "2026-09-15"), -1);
  assert.equal(dayOffsetFor(TODAY, "2026-09-17"), 1);

  // Month and year boundaries are ordinary days here too.
  assert.equal(dayOffsetFor("2026-10-01", "2026-09-30"), -1);
  assert.equal(dayOffsetFor("2027-01-01", "2026-12-31"), -1);
});

/* --------------------------------- grouping ---------------------------------- */

test("the week's tasks are split into its seven days, empty days included", () => {
  const tasks = [
    task({ id: "wed", title: "Wednesday", date: TODAY }),
    task({ id: "mon", title: "Monday", date: WEEK_START }),
    // Outside the week: must not appear in any bucket.
    task({ id: "next", title: "Next week", date: "2026-09-21" }),
    task({ id: "before", title: "Before", date: "2026-09-13" }),
  ];

  const buckets = weekDayBuckets(tasks, weekDayKeys(WEEK_START));

  assert.equal(buckets.length, 7);
  assert.deepEqual(
    buckets.map((bucket) => bucket.date),
    weekDayKeys(WEEK_START),
  );
  // Monday 14th, then Wednesday 16th: the third bucket, because the week
  // starts on Monday and empty days still get their own bucket.
  assert.deepEqual(
    buckets.map((bucket) => bucket.tasks.map((item) => item.id)),
    [["mon"], [], ["wed"], [], [], [], []],
  );
});

test("a day's tasks are ordered the way the day itself is", () => {
  const tasks = [
    task({ id: "free", title: "No time", date: TODAY, priority: "medium" }),
    task({
      id: "late",
      title: "Late",
      date: TODAY,
      startTime: "18:00",
      endTime: "19:00",
    }),
    task({
      id: "early",
      title: "Early",
      date: TODAY,
      startTime: "09:00",
      endTime: "10:00",
    }),
  ];

  const [, , wednesday] = weekDayBuckets(tasks, weekDayKeys(WEEK_START));

  // Scheduled work by the clock, untimed work after it — the same order the
  // Today list uses, so a task does not move when the user looks at the week.
  assert.deepEqual(
    wednesday.tasks.map((item) => item.id),
    ["early", "late", "free"],
  );
});

test("moving a task to another day is a date patch and nothing more", () => {
  // What the Week view's move sends: the new day, and nothing that could wipe
  // the goal link, the priority or the times the user set.
  const patch = taskPatch({ date: "2026-09-21" });

  assert.deepEqual(patch, { date: "2026-09-21" });
  for (const field of ["goalId", "priority", "startTime", "endTime", "status"]) {
    assert.ok(!(field in patch), `${field} must not be in the patch`);
  }
});

/* ---------------------------------- review ----------------------------------- */

test("a week summary counts planned, completed, unfinished and dropped", () => {
  const tasks = [
    // Monday: done, and open work still owed.
    task({ id: "m-done", title: "Done Monday", date: WEEK_START, status: "done" }),
    task({
      id: "m-open",
      title: "Open Monday",
      date: WEEK_START,
      priority: "high",
      goalId: "goal-1",
    }),
    // Tuesday: a scheduled task that is done.
    task({
      id: "t-done",
      title: "Done Tuesday",
      date: "2026-09-15",
      status: "done",
      startTime: "09:00",
      endTime: "10:30",
    }),
    // Today: open, and not yet "unfinished" — the day is not over.
    task({
      id: "today",
      title: "Today",
      date: TODAY,
      startTime: "14:00",
      endTime: "14:30",
      goalId: "goal-1",
    }),
    // Later in the week: still to come.
    task({ id: "fri", title: "Friday", date: "2026-09-18" }),
    // Taken off the plan: neither a success nor a failure.
    task({ id: "dropped", title: "Dropped", date: WEEK_END, dropped: true }),
    // Outside the week entirely.
    task({ id: "next", title: "Next week", date: "2026-09-21" }),
  ];

  const summary = summarizeWeek(tasks, weekDayKeys(WEEK_START), TODAY);

  assert.equal(summary.planned, 5);
  assert.equal(summary.completed, 2);
  assert.equal(summary.unfinished, 1);
  assert.equal(summary.upcoming, 2);
  assert.equal(summary.dropped, 1);
  assert.equal(summary.scheduled, 2);
  assert.equal(summary.unscheduled, 3);
  assert.equal(summary.plannedMinutes, 90 + 30);
  assert.equal(summary.goalLinked, 2);
  assert.equal(summary.due, 3);
  assert.equal(summary.completionPercent, 67);
});

test("dropped tasks stay out of the week's completion metrics", () => {
  // The rule from the day view, unchanged: a dropped task is off the plan, so
  // it cannot count as a failure the user never agreed to.
  const withDropped = [
    task({ id: "done", title: "Done", date: WEEK_START, status: "done" }),
    task({ id: "dropped", title: "Dropped", date: WEEK_START, dropped: true }),
  ];

  const summary = summarizeWeek(withDropped, weekDayKeys(WEEK_START), TODAY);

  assert.equal(summary.planned, 1);
  assert.equal(summary.dropped, 1);
  assert.equal(summary.due, 1);
  assert.equal(summary.completionPercent, 100);
});

test("an empty week reports zeros rather than a percentage of nothing", () => {
  const summary = summarizeWeek([], weekDayKeys(WEEK_START), TODAY);

  assert.equal(summary.planned, 0);
  assert.equal(summary.completed, 0);
  assert.equal(summary.unfinished, 0);
  assert.equal(summary.upcoming, 0);
  assert.equal(summary.dropped, 0);
  assert.equal(summary.plannedMinutes, 0);
  assert.equal(summary.completionPercent, null);
  assert.equal(summary.due, 0);
});

test("unfinished depends on where the week sits relative to now", () => {
  const past = [
    task({ id: "p1", title: "Past open", date: "2026-09-08" }),
    task({ id: "p2", title: "Past done", date: "2026-09-09", status: "done" }),
  ];
  const pastSummary = summarizeWeek(past, weekDayKeys("2026-09-07"), TODAY);

  assert.equal(pastSummary.unfinished, 2 - 1);
  assert.equal(pastSummary.upcoming, 0);
  assert.equal(pastSummary.due, 2);
  assert.equal(pastSummary.completionPercent, 50);

  const next = [
    task({ id: "n1", title: "Next week", date: "2026-09-21" }),
    task({ id: "n2", title: "Next week too", date: "2026-09-22" }),
  ];
  const nextSummary = summarizeWeek(next, weekDayKeys("2026-09-21"), TODAY);

  // Nothing is owed in a week that has not started: it is all still to come,
  // and there is nothing to report a completion rate against.
  assert.equal(nextSummary.unfinished, 0);
  assert.equal(nextSummary.upcoming, 2);
  assert.equal(nextSummary.due, 0);
  assert.equal(nextSummary.completionPercent, null);
});

test("a week with everything still open is 0%, not empty", () => {
  const open = [
    task({ id: "d1", title: "One", date: WEEK_START }),
    task({ id: "d2", title: "Two", date: "2026-09-15" }),
  ];

  const summary = summarizeWeek(open, weekDayKeys(WEEK_START), TODAY);

  assert.equal(summary.due, 2);
  assert.equal(summary.completionPercent, 0);
});

test("planned time counts only the tasks that have a time", () => {
  const tasks = [
    task({
      id: "timed",
      title: "Timed",
      date: WEEK_START,
      startTime: "08:00",
      endTime: "09:15",
    }),
    task({ id: "free", title: "Free", date: WEEK_START }),
    task({
      id: "dropped",
      title: "Dropped",
      date: WEEK_START,
      startTime: "10:00",
      endTime: "12:00",
      dropped: true,
    }),
  ];

  const summary = summarizeWeek(tasks, weekDayKeys(WEEK_START), TODAY);

  assert.equal(summary.scheduled, 1);
  assert.equal(summary.unscheduled, 1);
  assert.equal(summary.plannedMinutes, 75);
});

test("a goal-linked task is counted when it is one", () => {
  const tasks = [
    task({ id: "linked", title: "Linked", date: TODAY, goalId: "goal-1" }),
    task({ id: "alone", title: "Alone", date: TODAY }),
  ];

  assert.equal(summarizeWeek(tasks, weekDayKeys(WEEK_START), TODAY).goalLinked, 1);
});
