import assert from "node:assert/strict";
import { test } from "node:test";

import type { Goal, GoalSubtask, LifeTask } from "@/types/lifeos";

import {
  compareActionableTasks,
  compareCompletedTasks,
  goalProgressOf,
  goalStatusOf,
  isGoalSelectable,
  legacyOpenSubtasks,
  legacySubtaskTaskDrafts,
  nextActionFor,
  remainingSubtasksAfterConversion,
  splitGoalTasks,
  splitGoalsByStatus,
  tasksForGoal,
} from "./goals.ts";
import { compareDayTasks, DROP_PATCH } from "./taskSchedule.ts";
import { taskPatch } from "./taskPatch.ts";

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

function goal(
  overrides: Partial<Goal> & Pick<Goal, "id" | "title">,
): Goal {
  return {
    description: "",
    deadline: "",
    status: "active",
    subtasks: [],
    createdAt: null,
    ...overrides,
  };
}

/* ------------------------------- goal ↔ task --------------------------------- */

test("a task with no goal is valid and belongs to no goal", () => {
  const standalone = task({ id: "1", title: "Купить молоко" });

  assert.equal(standalone.goalId, undefined);
  assert.deepEqual(tasksForGoal([standalone], "goal-1"), []);
  // A goal nobody linked anything to has no progress to show — not zero
  // percent of a goal, but no tasks at all.
  assert.deepEqual(goalProgressOf(tasksForGoal([standalone], "goal-1")), {
    total: 0,
    done: 0,
    open: 0,
    dropped: 0,
  });
});

test("a task that carries a goal id is linked to that goal", () => {
  const linked = task({ id: "1", title: "Позвонить клиенту", goalId: "goal-1" });
  const other = task({ id: "2", title: "Купить молоко" });

  const linkedTasks = tasksForGoal([linked, other], "goal-1");

  assert.deepEqual(
    linkedTasks.map((item) => item.id),
    ["1"],
  );
  assert.equal(goalProgressOf(linkedTasks).total, 1);
});

test("only active goals are offered for new work", () => {
  assert.equal(isGoalSelectable(goal({ id: "1", title: "A" })), true);
  assert.equal(
    isGoalSelectable(goal({ id: "2", title: "B", status: "completed" })),
    false,
  );
  assert.equal(
    isGoalSelectable(goal({ id: "3", title: "C", status: "archived" })),
    false,
  );

  // Old documents have no status at all, and an old goal is an active one.
  assert.equal(goalStatusOf({ status: undefined }), "active");
});

/* ------------------------------- data integrity ------------------------------ */

test("editing a task keeps its goal link", () => {
  // The exact patch the task form sends.
  const patch = taskPatch({
    title: "Позвонить клиенту",
    startTime: "14:00",
    endTime: "14:30",
    status: "in_progress",
    priority: "high",
    goalId: "goal-1",
  });

  assert.equal(patch.goalId, "goal-1");
});

test("a title-only edit cannot wipe the goal link", () => {
  const patch = taskPatch({ title: "Fixed a typo" });

  for (const field of ["goalId", "date", "priority", "startTime", "endTime"]) {
    assert.ok(!(field in patch), `${field} must not be in the patch`);
  }
});

test("rescheduling, carrying and dropping keep the goal link", () => {
  // Reschedule (including its optional new time), carry, and drop are all
  // partial patches that say nothing about the goal — so Firestore leaves it.
  for (const patch of [
    taskPatch({ date: TOMORROW }),
    taskPatch({ date: TOMORROW, startTime: "09:00", endTime: "10:00" }),
    taskPatch(DROP_PATCH),
    taskPatch({ status: "done" }),
  ]) {
    assert.ok(!("goalId" in patch));
  }

  // And the task itself is untouched by a drop: only the flag changes.
  const linked = task({ id: "1", title: "Позвонить клиенту", goalId: "goal-1" });
  const dropped = { ...linked, ...DROP_PATCH };

  assert.equal(dropped.goalId, "goal-1");
  assert.equal(dropped.title, linked.title);
  assert.equal(dropped.date, linked.date);
});

test("a completed task keeps its goal link and counts as progress", () => {
  const done = task({
    id: "1",
    title: "Позвонить клиенту",
    goalId: "goal-1",
    status: "done",
  });

  assert.deepEqual(
    tasksForGoal([done], "goal-1").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(goalProgressOf([done]), {
    total: 1,
    done: 1,
    open: 0,
    dropped: 0,
  });
});

test("archiving a goal leaves its linked tasks exactly as they were", () => {
  const archived = goal({ id: "goal-1", title: "Launch", status: "archived" });
  const linked = task({ id: "1", title: "Ship it", goalId: archived.id });

  const { active, finished } = splitGoalsByStatus([
    archived,
    goal({ id: "goal-2", title: "Active one" }),
  ]);

  assert.deepEqual(
    active.map((item) => item.id),
    ["goal-2"],
  );
  assert.deepEqual(
    finished.map((item) => item.id),
    ["goal-1"],
  );
  // The work is untouched: still linked, still counted on the goal's page.
  assert.deepEqual(
    tasksForGoal([linked], archived.id).map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(goalProgressOf(tasksForGoal([linked], archived.id)), {
    total: 1,
    done: 0,
    open: 1,
    dropped: 0,
  });
});

test("a deleted goal leaves the task intact and matches no other goal", () => {
  const orphan = task({ id: "1", title: "Ship it", goalId: "deleted-goal" });
  const tasks = [orphan];

  // The link is just an id, so a task pointing at a goal that no longer exists
  // keeps matching that id — nothing rewrites the task when a goal is deleted.
  // What a *missing goal document* means is the UI's reading (the badge says
  // "goal removed"); the task itself stays exactly as it was, and it belongs to
  // no other goal.
  assert.deepEqual(
    tasksForGoal(tasks, "deleted-goal").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(tasksForGoal(tasks, "another-goal"), []);
  assert.deepEqual(orphan, task({ id: "1", title: "Ship it", goalId: "deleted-goal" }));
  assert.equal(orphan.date, TODAY);
  assert.equal(orphan.status, "todo");
});

/* --------------------------------- progress ---------------------------------- */

test("task progress counts linked tasks, not tasks in general", () => {
  const linked = [
    task({ id: "1", title: "A", goalId: "g", status: "done" }),
    task({ id: "2", title: "B", goalId: "g", status: "done" }),
    task({ id: "3", title: "C", goalId: "g", status: "done" }),
    task({ id: "4", title: "D", goalId: "g" }),
    task({ id: "5", title: "E", goalId: "g", status: "in_progress" }),
    task({ id: "6", title: "F", goalId: "g" }),
    task({ id: "7", title: "G", goalId: "g" }),
  ];
  // A dropped task was taken off the plan on purpose, so it is neither a
  // success nor a failure — it must not sit in the denominator.
  const dropped = task({ id: "8", title: "H", goalId: "g", dropped: true });
  const unrelated = task({ id: "9", title: "Купить молоко" });

  // The list a goal is counted from is its linked tasks — that scoping is what
  // `tasksForGoal` does, and every caller routes through it.
  const progress = goalProgressOf(
    tasksForGoal([...linked, dropped, unrelated], "g"),
  );

  assert.deepEqual(progress, { total: 7, done: 3, open: 4, dropped: 1 });
  // 3 of 7 tasks is *not* "43% of the goal reached" — the type only ever
  // carries the pair the UI renders, and no percentage of the goal exists.
  assert.equal(Object.keys(progress).includes("percent"), false);
});

test("a goal with no linked tasks has no progress and no next action", () => {
  const empty = goal({ id: "goal-1", title: "Launch" });

  assert.deepEqual(goalProgressOf([]), {
    total: 0,
    done: 0,
    open: 0,
    dropped: 0,
  });
  assert.equal(nextActionFor([], TODAY), null);
  assert.deepEqual(splitGoalTasks([], TODAY), { open: [], completed: [] });
  assert.deepEqual(legacySubtaskTaskDrafts(empty, TODAY), []);
});

/* -------------------------------- next action -------------------------------- */

test("the next action is work you can do now, not work dated ahead", () => {
  const tasks = [
    task({ id: "later", title: "Next week", goalId: "g", date: "2026-09-23" }),
    task({ id: "open", title: "Open now", goalId: "g" }),
  ];

  assert.equal(nextActionFor(tasks, TODAY)?.id, "open");
  // Everything finished or dropped means there is nothing to offer.
  assert.equal(
    nextActionFor(
      [
        task({ id: "done", title: "Done", goalId: "g", status: "done" }),
        task({ id: "drop", title: "Dropped", goalId: "g", dropped: true }),
      ],
      TODAY,
    ),
    null,
  );
});

test("a timed task is offered before an untimed one, earliest first", () => {
  const tasks = [
    task({ id: "free", title: "No time" }),
    task({ id: "late", title: "Late", startTime: "18:00", endTime: "19:00" }),
    task({ id: "early", title: "Early", startTime: "09:00", endTime: "10:00" }),
  ];

  assert.equal(nextActionFor(tasks, TODAY)?.id, "early");
});

test("priority decides between tasks that have no time to decide it", () => {
  const tasks = [
    task({ id: "low", title: "Low", priority: "low" }),
    task({ id: "high", title: "High", priority: "high" }),
    // A task written before priorities existed reads as medium, not unknown.
    task({ id: "legacy", title: "Legacy" }),
  ];

  assert.deepEqual(
    [...tasks].sort((a, b) => compareActionableTasks(a, b, TODAY)).map(
      (item) => item.id,
    ),
    ["high", "legacy", "low"],
  );
  assert.equal(nextActionFor(tasks, TODAY)?.id, "high");
});

test("priority never moves a task that has a real slot in the day", () => {
  const scheduledLow = task({
    id: "scheduled",
    title: "Scheduled",
    priority: "low",
    startTime: "16:00",
    endTime: "17:00",
  });
  const untimedHigh = task({ id: "untimed", title: "Untimed", priority: "high" });

  // The day is ordered by the clock first: an important task cannot jump in
  // front of work that is actually planned for an hour.
  assert.deepEqual(
    [untimedHigh, scheduledLow].sort(compareDayTasks).map((item) => item.id),
    ["scheduled", "untimed"],
  );
  // "Next action" is the next thing that actually happens, so a task with an
  // hour still comes before an untimed one — priority only decides between
  // tasks that have no hour to be compared by.
  assert.equal(
    nextActionFor([untimedHigh, scheduledLow], TODAY)?.id,
    "scheduled",
  );
  assert.equal(nextActionFor([untimedHigh], TODAY)?.id, "untimed");
});

/* ------------------------------- task lists --------------------------------- */

test("a goal's tasks split into open work and finished work", () => {
  const tasks = [
    task({ id: "open", title: "Open", goalId: "g" }),
    task({ id: "done-old", title: "Old", goalId: "g", status: "done" }),
    task({ id: "done-new", title: "New", goalId: "g", status: "done" }),
  ];

  const { open, completed } = splitGoalTasks(tasks, TODAY);

  assert.deepEqual(
    open.map((item) => item.id),
    ["open"],
  );
  assert.equal(completed.length, 2);
});

test("completed tasks are listed newest completion first", () => {
  const at = (millis: number) => ({ toMillis: () => millis }) as never;
  const tasks = [
    task({ id: "older", title: "Older", status: "done", completedAt: at(1) }),
    task({ id: "newer", title: "Newer", status: "done", completedAt: at(2) }),
    task({ id: "unknown", title: "Unknown", status: "done", completedAt: null }),
  ];

  assert.deepEqual(
    [...tasks].sort(compareCompletedTasks).map((item) => item.id),
    ["newer", "older", "unknown"],
  );
});

/* ------------------------- tasks written before goals ------------------------ */

test("a task written before goals and priorities existed still works", () => {
  // Exactly the shape of an old Firestore document: no `goalId`, no
  // `priority`, no `dropped`.
  const legacy = {
    id: "old-1",
    title: "Old task",
    startTime: "",
    endTime: "",
    status: "todo",
    date: YESTERDAY,
    createdAt: null,
  } as unknown as LifeTask;

  assert.equal(tasksForGoal([legacy], "g").length, 0);
  assert.equal(nextActionFor([legacy], TODAY)?.id, "old-1");
  assert.equal(goalProgressOf([legacy]).total, 1);
  assert.equal(compareDayTasks(legacy, legacy), 0);
});

/* ------------------------------ legacy subtasks ----------------------------- */

test("open legacy steps become real, unscheduled tasks for the goal", () => {
  const steps: GoalSubtask[] = [
    { id: "s1", title: "Write the release notes", done: false },
    { id: "s2", title: "Book the venue", done: true },
    { id: "s3", title: "Email the list", done: false },
  ];
  const legacyGoal = goal({ id: "goal-1", title: "Launch", subtasks: steps });

  assert.deepEqual(
    legacyOpenSubtasks(legacyGoal).map((step) => step.title),
    ["Write the release notes", "Email the list"],
  );

  const drafts = legacySubtaskTaskDrafts(legacyGoal, TODAY);

  // Real tasks: they show up in Today and on the Schedule like any other work,
  // and they carry the goal link so the goal's progress is a count of them.
  assert.deepEqual(drafts, [
    {
      title: "Write the release notes",
      startTime: "",
      endTime: "",
      status: "todo",
      priority: "medium",
      date: TODAY,
      goalId: "goal-1",
    },
    {
      title: "Email the list",
      startTime: "",
      endTime: "",
      status: "todo",
      priority: "medium",
      date: TODAY,
      goalId: "goal-1",
    },
  ]);
});

test("converting legacy steps keeps the completed ones as history", () => {
  const steps: GoalSubtask[] = [
    { id: "s1", title: "Open", done: false },
    { id: "s2", title: "Done", done: true },
  ];

  // Completed steps are not turned into tasks: they were finished at a moment
  // nobody recorded, and a task marked done today would invent that history.
  assert.deepEqual(
    remainingSubtasksAfterConversion({ subtasks: steps }).map((step) => step.id),
    ["s2"],
  );
});
