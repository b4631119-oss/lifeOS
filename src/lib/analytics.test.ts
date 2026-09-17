import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Timestamp } from "firebase/firestore";

import type { Goal, Habit, LifeTask } from "@/types/lifeos";

import {
  buildAnalyticsReport,
  buildDailySummaries,
  buildHourHistogram,
  completionSamples,
  hasAnyData,
  hourInsight,
  MIN_HOUR_SAMPLES,
  recentDayKeys,
  summarizeGoals,
  summarizeWindow,
  tasksWithinDays,
  type HourBucket,
} from "./analytics.ts";

const TODAY = "2026-09-16";

function task(overrides: Partial<LifeTask> = {}): LifeTask {
  return {
    id: overrides.id ?? "t",
    title: overrides.title ?? "Task",
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
    date: TODAY,
    createdAt: null,
    ...overrides,
  };
}

/** A task the user also put on the clock. */
function timed(overrides: Partial<LifeTask> = {}): LifeTask {
  return task({
    startTime: "09:00",
    endTime: "10:00",
    ...overrides,
  });
}

/** A `Timestamp` stand-in — the code under test only ever calls `toDate()`. */
function stamp(hour: number, minute = 0): Timestamp {
  return {
    toDate: () => new Date(2026, 8, 16, hour, minute),
  } as unknown as Timestamp;
}

function bucket(hour: number, count: number): HourBucket {
  return { hour, count };
}

const HABIT: Habit = {
  id: "h1",
  name: "Run",
  active: true,
  createdAt: null,
};

const GOAL: Goal = {
  id: "g1",
  title: "Ship the release",
  description: "",
  deadline: "2026-09-30",
  status: "active",
  subtasks: [],
  createdAt: null,
};

describe("summarizeWindow", () => {
  it("counts work assigned to a day as planned, hour or no hour", () => {
    // 8 written down, one of them taken off the plan: the period commits to 7
    // tasks, of which 4 also carry a time and 3 are done.
    const tasks = [
      ...Array.from({ length: 3 }, (_, i) =>
        task({ id: `u${i}`, title: `Untimed ${i}` }),
      ),
      task({ id: "u-dropped", dropped: true }),
      timed({ id: "p1", status: "done" }),
      timed({ id: "p2", status: "done" }),
      timed({ id: "p3", status: "done" }),
      timed({ id: "p4" }),
    ];

    const summary = summarizeWindow(tasks);

    assert.equal(summary.captured, 8);
    assert.equal(summary.planned, 7);
    assert.equal(summary.timed, 4);
    assert.equal(summary.untimed, 3);
    assert.equal(summary.completed, 3);
    assert.equal(summary.dropped, 1);
    // 3 of the 7 the period committed to — not 3 of the 4 on the clock.
    assert.equal(summary.completionPercent, 43);
  });

  it("divides by planned work, not by the part that has a time", () => {
    // The case this module was fixed for: two of the five planned tasks carry a
    // time, two are done. 2/5, never 2/2.
    const tasks = [
      timed({ id: "p1", status: "done" }),
      timed({ id: "p2" }),
      task({ id: "u1", status: "done" }),
      task({ id: "u2" }),
      task({ id: "u3" }),
    ];

    const summary = summarizeWindow(tasks);

    assert.equal(summary.planned, 5);
    assert.equal(summary.timed, 2);
    assert.equal(summary.untimed, 3);
    assert.equal(summary.completed, 2);
    assert.equal(summary.completionPercent, 40);
  });

  it("counts a finished task with no time as completed plan work", () => {
    const summary = summarizeWindow([
      task({ id: "u1", status: "done" }),
      task({ id: "u2", status: "done" }),
      timed({ id: "p1" }),
    ]);

    assert.equal(summary.planned, 3);
    assert.equal(summary.completed, 2);
    assert.equal(summary.completionPercent, 67);
  });

  it("reports no completion figure when nothing is planned", () => {
    // Captures whose work was all taken off the plan: there is no plan to have
    // followed, so the figure is absent rather than 0%.
    const summary = summarizeWindow([
      task({ id: "d1", dropped: true }),
      task({ id: "d2", dropped: true }),
    ]);

    assert.equal(summary.captured, 2);
    assert.equal(summary.planned, 0);
    assert.equal(summary.completionPercent, null);
  });

  it("reports 0% when there is a plan and none of it is done", () => {
    const summary = summarizeWindow([
      timed({ id: "p1" }),
      timed({ id: "p2" }),
      task({ id: "u1" }),
      task({ id: "u2" }),
    ]);

    assert.equal(summary.planned, 4);
    assert.equal(summary.completed, 0);
    assert.equal(summary.completionPercent, 0);
  });

  it("keeps a dropped task in the captured count and out of every figure", () => {
    const summary = summarizeWindow([
      timed({ id: "p1", status: "done" }),
      timed({ id: "d1", status: "done", dropped: true }),
      task({ id: "u1" }),
    ]);

    assert.equal(summary.captured, 3);
    assert.equal(summary.planned, 2);
    assert.equal(summary.timed, 1);
    assert.equal(summary.completed, 1);
    assert.equal(summary.dropped, 1);
    assert.equal(summary.completionPercent, 50);
  });

  it("is empty for an empty window", () => {
    const summary = summarizeWindow([]);

    assert.equal(summary.captured, 0);
    assert.equal(summary.planned, 0);
    assert.equal(summary.completionPercent, null);
    assert.equal(summary.dropped, 0);
  });
});

describe("buildHourHistogram", () => {
  it("counts finished tasks by the hour they were marked done", () => {
    const buckets = buildHourHistogram([
      task({ id: "a", status: "done", completedAt: stamp(9) }),
      task({ id: "b", status: "done", completedAt: stamp(9, 40) }),
      task({ id: "c", status: "done", completedAt: stamp(21) }),
    ]);

    assert.equal(buckets.length, 24);
    assert.equal(buckets[9].count, 2);
    assert.equal(buckets[21].count, 1);
    assert.equal(completionSamples(buckets), 3);
  });

  it("does not care whether the task was given a time", () => {
    // The hour analysis is about when work actually finished, so it reads
    // `completedAt` alone — planned time plays no part either way.
    const without = buildHourHistogram([
      task({ id: "a", status: "done", completedAt: stamp(9) }),
    ]);
    const with_ = buildHourHistogram([
      timed({ id: "a", status: "done", completedAt: stamp(9) }),
    ]);

    assert.equal(completionSamples(without), 1);
    assert.equal(completionSamples(with_), 1);
  });

  it("skips open tasks and completions with no recorded time", () => {
    const buckets = buildHourHistogram([
      task({ id: "a", status: "done" }),
      task({ id: "b", status: "todo", completedAt: stamp(9) }),
      // Timed, but that is when it was meant to happen — not when it did.
      timed({ id: "c", status: "done", completedAt: null }),
    ]);

    assert.equal(completionSamples(buckets), 0);
  });
});

describe("hourInsight", () => {
  it("refuses to name an hour below the sample threshold", () => {
    const buckets = [
      ...Array.from({ length: 24 }, (_, hour) => bucket(hour, 0)),
    ];
    buckets[9] = bucket(9, 3);

    const insight = hourInsight(buckets);

    assert.deepEqual(insight, {
      kind: "insufficient",
      samples: 3,
      needed: MIN_HOUR_SAMPLES,
    });
  });

  it("names the strongest hour once there is enough to look at", () => {
    const buckets = [
      ...Array.from({ length: 24 }, (_, hour) => bucket(hour, 0)),
    ];
    buckets[8] = bucket(8, 2);
    buckets[14] = bucket(14, 4);
    buckets[19] = bucket(19, 1);

    assert.deepEqual(hourInsight(buckets), {
      kind: "peak",
      hour: 14,
      count: 4,
      samples: 7,
    });
  });

  it("reports no standing-out hour when the completions are spread out", () => {
    // Enough samples, but every hour holds one: naming the earliest would
    // invent a routine out of a tie.
    const buckets = [
      ...Array.from({ length: 24 }, (_, hour) => bucket(hour, 0)),
    ];
    buckets[8] = bucket(8, 1);
    buckets[10] = bucket(10, 1);
    buckets[15] = bucket(15, 1);
    buckets[18] = bucket(18, 1);
    buckets[22] = bucket(22, 1);

    assert.deepEqual(hourInsight(buckets), { kind: "spread", samples: 5 });
  });
});

describe("buildDailySummaries", () => {
  it("lists every day of the window, oldest first", () => {
    const rows = buildDailySummaries([], 3, "en", new Date(2026, 8, 16));

    assert.deepEqual(
      rows.map((row) => row.date),
      ["2026-09-14", "2026-09-15", "2026-09-16"],
    );
  });

  it("counts the day's plan the same way the window does", () => {
    const rows = buildDailySummaries(
      [
        timed({ id: "a", date: TODAY, status: "done" }),
        task({ id: "b", date: TODAY }),
        task({ id: "d", date: "2026-09-15", dropped: true }),
        task({ id: "c", date: "2026-09-15" }),
      ],
      3,
      "en",
      new Date(2026, 8, 16),
    );

    const today = rows[2];
    // Planned, not `timed`: the untimed task is part of the day's plan.
    assert.equal(today.planned, 2);
    assert.equal(today.timed, 1);
    assert.equal(today.completed, 1);

    const yesterday = rows[1];
    // The dropped task is not part of that day's plan any more.
    assert.equal(yesterday.planned, 1);
    assert.equal(yesterday.timed, 0);
    assert.equal(yesterday.completed, 0);

    // A day with nothing on it is a row of zeros, not a missing row.
    assert.equal(rows[0].planned, 0);
    assert.equal(rows[0].timed, 0);
    assert.equal(rows[0].completed, 0);
  });

  it("counts a finished untimed task as that day's completed work", () => {
    const [row] = buildDailySummaries(
      [task({ id: "a", date: TODAY, status: "done" })],
      1,
      "en",
      new Date(2026, 8, 16),
    );

    assert.equal(row.planned, 1);
    assert.equal(row.timed, 0);
    assert.equal(row.completed, 1);
  });

  it("leaves out tasks dated outside the window", () => {
    const rows = buildDailySummaries(
      [task({ id: "old", date: "2026-09-01" })],
      3,
      "en",
      new Date(2026, 8, 16),
    );

    assert.equal(
      rows.reduce((sum, row) => sum + row.planned, 0),
      0,
    );
  });

  it("labels the days in the requested locale", () => {
    const [row] = buildDailySummaries([], 1, "ru", new Date(2026, 8, 14));

    assert.match(row.label, /^14\b/);
  });
});

describe("summarizeGoals", () => {
  it("groups the window's work by goal, strongest progress first", () => {
    const second: Goal = { ...GOAL, id: "g2", title: "Read more" };
    const rows = summarizeGoals(
      [
        task({ id: "a", goalId: "g1", status: "done" }),
        task({ id: "b", goalId: "g1" }),
        task({ id: "c", goalId: "g2", status: "done" }),
      ],
      [GOAL, second],
    );

    assert.deepEqual(rows, [
      {
        id: "g1",
        title: "Ship the release",
        status: "active",
        planned: 2,
        completed: 1,
      },
      {
        id: "g2",
        title: "Read more",
        status: "active",
        planned: 1,
        completed: 1,
      },
    ]);
  });

  it("counts goal work with no time, whether it is done or not", () => {
    const rows = summarizeGoals(
      [
        task({ id: "a", goalId: "g1", status: "done" }),
        task({ id: "b", goalId: "g1" }),
        timed({ id: "c", goalId: "g1" }),
      ],
      [GOAL],
    );

    assert.equal(rows[0].planned, 3);
    assert.equal(rows[0].completed, 1);
  });

  it("ignores work with no goal and links to goals that no longer exist", () => {
    const rows = summarizeGoals(
      [task({ id: "a" }), task({ id: "b", goalId: "deleted-goal" })],
      [GOAL],
    );

    assert.deepEqual(rows, []);
  });

  it("keeps a finished or archived goal labelled as such", () => {
    const rows = summarizeGoals(
      [task({ id: "a", goalId: "g1", status: "done" })],
      [{ ...GOAL, status: "archived" }],
    );

    assert.equal(rows[0].status, "archived");
  });

  it("leaves a goal out when its only work in the window was dropped", () => {
    const rows = summarizeGoals(
      [task({ id: "a", goalId: "g1", dropped: true })],
      [GOAL],
    );

    assert.deepEqual(rows, []);
  });
});

describe("buildAnalyticsReport", () => {
  const report = () =>
    buildAnalyticsReport({
      tasks: [
        timed({ id: "a", date: TODAY, status: "done" }),
        task({ id: "b", date: TODAY, goalId: "g1" }),
        task({ id: "old", date: "2026-08-01" }),
        // Planning ahead is normal; it must not be counted in a window that
        // ends today, and it must not make the read unbounded either.
        task({ id: "future", date: "2026-10-01" }),
      ],
      goals: [GOAL],
      activeHabits: [HABIT],
      doneDatesByHabit: new Map([[HABIT.id, new Set([TODAY])]]),
      today: TODAY,
      days: 7,
      locale: "en",
    });

  it("stays inside its window at both ends", () => {
    const result = report();

    assert.equal(result.range.from, "2026-09-10");
    assert.equal(result.range.to, TODAY);
    assert.equal(result.summary.captured, 2);
    assert.equal(result.summary.planned, 2);
    assert.equal(result.daily.length, 7);
    assert.equal(result.hasWindowTasks, true);
  });

  it("answers each of its questions from the same window", () => {
    const result = report();

    // One of the two planned tasks is done — the untimed one is planned work
    // too, so it is in the denominator.
    assert.equal(result.summary.completionPercent, 50);
    assert.equal(result.goals.length, 1);
    assert.equal(result.goals[0].planned, 1);
    assert.equal(result.streaks.length, 1);
    assert.equal(result.insight.kind, "insufficient");
  });

  it("reports an empty window instead of an empty account", () => {
    const result = buildAnalyticsReport({
      tasks: [task({ id: "old", date: "2026-08-01" })],
      goals: [],
      activeHabits: [],
      doneDatesByHabit: new Map(),
      today: TODAY,
      days: 7,
      locale: "en",
    });

    assert.equal(result.hasWindowTasks, false);
    assert.equal(result.summary.captured, 0);
    assert.equal(result.summary.completionPercent, null);
    assert.ok(result.daily.every((day) => day.planned === 0));
  });
});

describe("window helpers", () => {
  it("recentDayKeys ends on today and steps back through the calendar", () => {
    assert.deepEqual(recentDayKeys(3, new Date(2026, 8, 1)), [
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });

  it("tasksWithinDays keeps only the tasks dated inside the window", () => {
    const kept = tasksWithinDays(
      [
        task({ id: "in", date: TODAY }),
        task({ id: "out", date: "2026-09-01" }),
      ],
      7,
      new Date(2026, 8, 16),
    );

    assert.deepEqual(
      kept.map((item) => item.id),
      ["in"],
    );
  });

  it("counts captured work as something to analyse", () => {
    assert.equal(hasAnyData([task({ id: "c" })], []), true);
  });

  it("has nothing to analyse for an account whose only tasks were dropped", () => {
    assert.equal(hasAnyData([task({ id: "c", dropped: true })], []), false);
    assert.equal(hasAnyData([], [HABIT]), true);
  });
});
