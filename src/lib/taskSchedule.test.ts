import assert from "node:assert/strict";
import { test } from "node:test";

import type { LifeTask } from "@/types/lifeos";

import {
  captureDraft,
  carryTargetDate,
  compareDayTasks,
  currentAndNextTasks,
  dayTaskRange,
  DROP_PATCH,
  groupUnfinishedByDay,
  isScheduled,
  limitGroups,
  plannedMinutes,
  splitDuration,
  taskMarkers,
  timeRangeError,
  unscheduledTasks,
} from "./taskSchedule.ts";

const TODAY = "2026-09-16";
const YESTERDAY = "2026-09-15";
const TOMORROW = "2026-09-17";

/** A task with only the fields a test cares about spelled out. */
function task(
  overrides: Partial<LifeTask> & Pick<LifeTask, "id" | "title">,
): LifeTask {
  return {
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
    date: TODAY,
    createdAt: null,
    ...overrides,
  };
}

/* ------------------------------- optional times ------------------------------ */

test("a task with no times at all is valid and unscheduled", () => {
  assert.equal(timeRangeError("", ""), null);

  const captured = task({ id: "1", title: "Позвонить клиенту" });
  assert.equal(isScheduled(captured), false);
  assert.deepEqual(unscheduledTasks([captured]), [captured]);
});

test("a title plus a time range is valid and scheduled", () => {
  assert.equal(timeRangeError("14:00", "14:30"), null);

  const scheduled = task({
    id: "1",
    title: "Позвонить клиенту",
    startTime: "14:00",
    endTime: "14:30",
  });
  assert.equal(isScheduled(scheduled), true);
  assert.deepEqual(unscheduledTasks([scheduled]), []);
});

test("a start without an end is rejected", () => {
  assert.equal(timeRangeError("14:00", ""), "incomplete");
  assert.equal(
    isScheduled(task({ id: "1", title: "x", startTime: "14:00" })),
    false,
  );
});

test("an end without a start is rejected", () => {
  assert.equal(timeRangeError("", "14:30"), "incomplete");
});

test("an end at or before the start is rejected", () => {
  assert.equal(timeRangeError("14:00", "14:00"), "order");
  assert.equal(timeRangeError("14:30", "14:00"), "order");
});

test("a half-filled range of unreadable values is rejected rather than parsed", () => {
  // "24:00" and "9:5" are not `HH:mm`; treating them as numbers used to make
  // "" read as midnight.
  assert.equal(timeRangeError("24:00", "24:30"), "incomplete");
  assert.equal(timeRangeError("25:00", ""), "incomplete");
  assert.equal(timeRangeError("9:5", "10:00"), "incomplete");
});

/* ---------------------------------- ordering --------------------------------- */

test("unscheduled tasks sort after the day's scheduled ones", () => {
  const day = [
    task({ id: "late", title: "Late", startTime: "18:00", endTime: "19:00" }),
    task({ id: "free", title: "Free" }),
    task({ id: "early", title: "Early", startTime: "09:00", endTime: "10:00" }),
  ];

  assert.deepEqual(
    day.sort(compareDayTasks).map((item) => item.id),
    ["early", "late", "free"],
  );
});

/* --------------------------------- carry/next -------------------------------- */

test("carry targets the day after the one on screen", () => {
  assert.equal(carryTargetDate(TODAY), TOMORROW);
  // Idempotent by construction: the patch carries an absolute date, not a "+1
  // day" instruction, so a repeated click lands on the same day again instead
  // of skipping one.
  assert.equal(carryTargetDate(TODAY), carryTargetDate(TODAY));
  // Month and year boundaries are real days, not "the 32nd".
  assert.equal(carryTargetDate("2026-09-30"), "2026-10-01");
  assert.equal(carryTargetDate("2026-12-31"), "2027-01-01");
});

/* ----------------------------------- drop ----------------------------------- */

test("dropping changes nothing but the dropped flag", () => {
  // Data safety: no delete, no status change, no lost title.
  assert.deepEqual(DROP_PATCH, { dropped: true });

  const merged = {
    ...task({ id: "1", title: "x", status: "in_progress" }),
    ...DROP_PATCH,
  };
  assert.equal(merged.dropped, true);
  assert.equal(merged.title, "x");
  assert.equal(merged.status, "in_progress");
  assert.equal(merged.date, TODAY);
});

/* -------------------------------- unfinished -------------------------------- */

test("unfinished tasks are grouped by day, newest first, open and not dropped", () => {
  const tasks = [
    task({ id: "today", title: "Today", date: TODAY }),
    task({ id: "y1", title: "Yesterday open", date: YESTERDAY }),
    task({
      id: "y2",
      title: "Yesterday done",
      date: YESTERDAY,
      status: "done",
    }),
    task({
      id: "y3",
      title: "Yesterday dropped",
      date: YESTERDAY,
      dropped: true,
    }),
    task({ id: "older", title: "Older", date: "2026-09-10" }),
    task({ id: "future", title: "Tomorrow", date: TOMORROW }),
  ];

  const groups = groupUnfinishedByDay(tasks, TODAY);

  assert.deepEqual(
    groups.map((group) => group.date),
    [YESTERDAY, "2026-09-10"],
  );
  assert.deepEqual(
    groups.map((group) => group.tasks.map((item) => item.id)),
    [["y1"], ["older"]],
  );
});

test("nothing is carried automatically: an unfinished task keeps its own date", () => {
  const tasks = [task({ id: "y1", title: "Yesterday", date: YESTERDAY })];
  const [group] = groupUnfinishedByDay(tasks, TODAY);

  // The task is *offered* for recovery, and only a user action would rewrite
  // its date — deriving the list never mutates it.
  assert.equal(group.tasks[0].date, YESTERDAY);
  assert.equal(tasks[0].date, YESTERDAY);
});

test("the recovery list is capped, with the remainder counted", () => {
  const tasks = Array.from({ length: 9 }, (_, index) =>
    task({
      id: `task-${index}`,
      title: `Task ${index}`,
      date: index < 2 ? YESTERDAY : "2026-09-14",
    }),
  );

  const { groups, hidden } = limitGroups(groupUnfinishedByDay(tasks, TODAY), 6);

  assert.equal(hidden, 3);
  assert.equal(
    groups.reduce((sum, group) => sum + group.tasks.length, 0),
    6,
  );
  // The newest day is listed first, so the recent work is what stays visible.
  assert.equal(groups[0].date, YESTERDAY);
});

/* ------------------------------ current and next ----------------------------- */

test("current and next follow the clock, ignoring unscheduled work", () => {
  const tasks = [
    task({ id: "past", title: "Past", startTime: "08:00", endTime: "09:00" }),
    task({ id: "now", title: "Now", startTime: "10:00", endTime: "11:30" }),
    task({ id: "later", title: "Later", startTime: "14:00", endTime: "15:00" }),
    task({ id: "free", title: "Free" }),
  ];

  const { current, next } = currentAndNextTasks(tasks, 10 * 60 + 30);

  assert.equal(current?.id, "now");
  assert.equal(next?.id, "later");
});

test("done and dropped tasks are neither current nor next", () => {
  const tasks = [
    task({
      id: "done",
      title: "Done",
      startTime: "10:00",
      endTime: "11:00",
      status: "done",
    }),
    task({
      id: "dropped",
      title: "Dropped",
      startTime: "12:00",
      endTime: "13:00",
      dropped: true,
    }),
  ];

  assert.deepEqual(currentAndNextTasks(tasks, 10 * 60 + 30), {
    current: null,
    next: null,
  });

  // Before the day starts and after it ends there is nothing to mark either —
  // the list simply shows no "now" or "next" row.
  const one = [
    task({ id: "only", title: "Only", startTime: "14:00", endTime: "15:00" }),
  ];
  assert.equal(currentAndNextTasks(one, 9 * 60).current, null);
  assert.equal(currentAndNextTasks(one, 9 * 60).next?.id, "only");
  assert.equal(currentAndNextTasks(one, 20 * 60).next, null);
});

/* ------------------------------- row markers -------------------------------- */

test("the clock marks exactly one current and one next row", () => {
  const tasks = [
    task({ id: "past", title: "Past", startTime: "08:00", endTime: "09:00" }),
    task({ id: "now", title: "Now", startTime: "10:00", endTime: "11:30" }),
    task({ id: "later", title: "Later", startTime: "14:00", endTime: "15:00" }),
    task({ id: "free", title: "Free" }),
  ];

  // The day list is ordered by time already; the marker only points at the two
  // rows the clock names, instead of repeating them in a card above the list.
  assert.deepEqual(taskMarkers(tasks, 10 * 60 + 30), {
    now: "current",
    later: "next",
  });
});

test("the marker never claims a row the clock cannot name", () => {
  const tasks = [
    task({
      id: "done",
      title: "Done",
      startTime: "10:00",
      endTime: "11:00",
      status: "done",
    }),
    task({
      id: "dropped",
      title: "Dropped",
      startTime: "10:00",
      endTime: "11:00",
      dropped: true,
    }),
    task({ id: "free", title: "Free" }),
  ];

  // An unfinished task with no hour is not "now" just because it is open, and a
  // finished one is not "now" just because the clock is inside its window.
  assert.deepEqual(taskMarkers(tasks, 10 * 60 + 30), {});
});

/* --------------------------------- capture ---------------------------------- */

test("a captured task is a title and nothing else", () => {
  const draft = captureDraft("Позвонить клиенту");

  assert.deepEqual(draft, {
    title: "Позвонить клиенту",
    // The empty pair *is* "unscheduled": capture must never invent an hour.
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
  });
  assert.equal(isScheduled(draft), false);
});

/* ------------------------------ planned minutes ------------------------------ */

test("planned time adds up the scheduled tasks only", () => {
  const tasks = [
    task({ id: "a", title: "A", startTime: "09:00", endTime: "10:30" }),
    task({ id: "b", title: "B", startTime: "14:00", endTime: "14:45" }),
    task({ id: "free", title: "No time" }),
    task({
      id: "dropped",
      title: "Dropped",
      startTime: "16:00",
      endTime: "17:00",
      dropped: true,
    }),
  ];

  assert.equal(plannedMinutes(tasks), 90 + 45);
  assert.equal(plannedMinutes([task({ id: "free", title: "No time" })]), 0);
});

test("a duration splits into hours and minutes", () => {
  assert.deepEqual(splitDuration(390), { hours: 6, minutes: 30 });
  assert.deepEqual(splitDuration(60), { hours: 1, minutes: 0 });
  assert.deepEqual(splitDuration(45), { hours: 0, minutes: 45 });
  assert.deepEqual(splitDuration(-5), { hours: 0, minutes: 0 });
});

/* ------------------------------- read bounds -------------------------------- */

test("a day view reads its own day and the recovery window behind it", () => {
  assert.deepEqual(dayTaskRange(TODAY, 14), {
    from: "2026-09-02",
    to: TODAY,
  });
});

test("a day view never reads past the day on screen", () => {
  // Both ends are required, and the upper one is the fix: an open range meant a
  // day view subscribed to every task the user had planned for any future date,
  // none of which it could display.
  const range = dayTaskRange(TODAY, 14);

  assert.equal(range.to, TODAY);
  assert.ok(range.to < TOMORROW);

  // Browsing a future day moves the whole window with it, still stopping there.
  assert.deepEqual(dayTaskRange("2026-09-20", 14), {
    from: "2026-09-06",
    to: "2026-09-20",
  });
});

test("a day view with no history window reads exactly one day", () => {
  assert.deepEqual(dayTaskRange(TODAY, 0), { from: TODAY, to: TODAY });
  assert.deepEqual(dayTaskRange(TODAY, -3), { from: TODAY, to: TODAY });
});
