import type {
  Goal,
  GoalStatus,
  GoalSubtask,
  LifeTask,
  NewTask,
} from "@/types/lifeos";

import { toMinutes } from "./date.ts";
import {
  priorityOf,
  priorityRank,
  tasksInPlan,
} from "./taskSchedule.ts";

/**
 * How a goal relates to the work that moves it.
 *
 * The link is one field: `LifeTask.goalId`. Everything here is a reading of it
 * and of the tasks themselves — no goal carries a copy of its progress, so a
 * number can never drift from the work it claims to describe. No React and no
 * Firebase, so it is all directly testable (`goals.test.ts`).
 */

/* ---------------------------------- status ---------------------------------- */

/**
 * A goal's state, defaulted for documents written before statuses existed.
 *
 * `undefined` is not a fourth state — it is simply an old document, and it
 * reads as active so nothing disappears from the user's list.
 */
export function goalStatusOf(goal: { status?: GoalStatus }): GoalStatus {
  return goal.status ?? "active";
}

/**
 * Whether a goal can be picked for *new* work.
 *
 * Only active goals: proposing a finished goal while capturing a task invites
 * the user to reopen something they closed on purpose. Existing links to a
 * completed or archived goal keep working and stay visible.
 */
export function isGoalSelectable(goal: { status?: GoalStatus }): boolean {
  return goalStatusOf(goal) === "active";
}

/** Goals split for display: what is being worked on, and what is history. */
export function splitGoalsByStatus(goals: Goal[]): {
  active: Goal[];
  finished: Goal[];
} {
  return {
    active: goals.filter((goal) => goalStatusOf(goal) === "active"),
    finished: goals.filter((goal) => goalStatusOf(goal) !== "active"),
  };
}

/* --------------------------------- progress --------------------------------- */

export type GoalProgress = {
  /** Linked tasks still on the plan — the denominator of the only number shown. */
  total: number;
  done: number;
  open: number;
  /** Linked tasks the user took off the plan; not counted either way. */
  dropped: number;
};

/**
 * Task progress: how many of the goal's linked tasks are done.
 *
 * Deliberately *not* a percentage of the goal being achieved — finishing 3 of 7
 * tasks does not mean the goal is 43% reached, and presenting it that way would
 * claim a model of success the app does not have. Dropped tasks are excluded,
 * exactly as they are from the day's own metrics.
 */
export function goalProgressOf(tasks: LifeTask[]): GoalProgress {
  const plan = tasksInPlan(tasks);
  const done = plan.filter((task) => task.status === "done").length;

  return {
    total: plan.length,
    done,
    open: plan.length - done,
    dropped: tasks.length - plan.length,
  };
}

/**
 * The linked tasks of one goal among the tasks in hand.
 *
 * Matching is by id only, so a task whose goal has since been deleted simply
 * stops matching — nothing is rewritten, and the task itself is untouched.
 */
export function tasksForGoal(tasks: LifeTask[], goalId: string): LifeTask[] {
  return tasks.filter((task) => task.goalId === goalId);
}

/* ------------------------------- next action -------------------------------- */

/**
 * The order in which open work for a goal is offered as "next":
 *
 * 1. work you can do now beats work dated in the future;
 * 2. a task with a time beats an untimed one, and the earlier hour wins;
 * 3. otherwise the more important task wins (high → low);
 * 4. ties break towards the older commitment, then alphabetically.
 *
 * A reading of fields that already exist — no scoring model, no AI, and no new
 * field that would have to be kept in step with the tasks.
 */
export function compareActionableTasks(
  a: LifeTask,
  b: LifeTask,
  today: string,
): number {
  const aFuture = a.date > today;
  const bFuture = b.date > today;
  if (aFuture !== bFuture) return aFuture ? 1 : -1;

  const aStart = toMinutes(a.startTime);
  const bStart = toMinutes(b.startTime);
  if ((aStart === null) !== (bStart === null)) return aStart === null ? 1 : -1;
  if (aStart !== null && bStart !== null && aStart !== bStart) {
    return aStart - bStart;
  }

  const byPriority = priorityRank(priorityOf(a)) - priorityRank(priorityOf(b));
  if (byPriority !== 0) return byPriority;

  if (a.date !== b.date) return a.date.localeCompare(b.date);

  return a.title.localeCompare(b.title);
}

/** The single most relevant open task for a goal, or `null` when there is none. */
export function nextActionFor(
  tasks: LifeTask[],
  today: string,
): LifeTask | null {
  const open = tasks.filter(
    (task) => !task.dropped && task.status !== "done",
  );
  if (open.length === 0) return null;

  return [...open].sort((a, b) => compareActionableTasks(a, b, today))[0];
}

/* ---------------------------------- lists ----------------------------------- */

/** Most recently finished first; tasks with no completion time come last. */
export function compareCompletedTasks(a: LifeTask, b: LifeTask): number {
  const aAt = a.completedAt?.toMillis() ?? null;
  const bAt = b.completedAt?.toMillis() ?? null;

  if (aAt !== null && bAt !== null && aAt !== bAt) return bAt - aAt;
  if ((aAt !== null) !== (bAt !== null)) return aAt !== null ? -1 : 1;

  return b.date.localeCompare(a.date);
}

export type GoalTaskLists = {
  /** Still to do, in next-action order. */
  open: LifeTask[];
  /** Already done, newest completion first. */
  completed: LifeTask[];
};

/** A goal's linked tasks split for display. */
export function splitGoalTasks(
  tasks: LifeTask[],
  today: string,
): GoalTaskLists {
  const plan = tasksInPlan(tasks);

  return {
    open: plan
      .filter((task) => task.status !== "done")
      .sort((a, b) => compareActionableTasks(a, b, today)),
    completed: plan
      .filter((task) => task.status === "done")
      .sort(compareCompletedTasks),
  };
}

/* ------------------------------ legacy subtasks ----------------------------- */

/** The pre-task checklist items a goal still carries that are not done. */
export function legacyOpenSubtasks(
  goal: Pick<Goal, "subtasks">,
): GoalSubtask[] {
  return goal.subtasks.filter((subtask) => !subtask.done);
}

/**
 * The task documents `Move open steps to tasks` creates.
 *
 * Every open legacy step becomes a real, unscheduled task for `date`, linked to
 * the goal — so the work shows up in Today and on the Schedule like any other
 * task, and the goal has exactly one kind of actionable item from then on.
 *
 * Completed legacy steps are left where they are: they were finished at some
 * moment nobody recorded, and turning them into tasks dated today would invent
 * a completion that never happened (and land in today's completion rate).
 */
export function legacySubtaskTaskDrafts(goal: Goal, date: string): NewTask[] {
  return legacyOpenSubtasks(goal).map((subtask) => ({
    title: subtask.title,
    startTime: "",
    endTime: "",
    status: "todo" as const,
    priority: "medium" as const,
    date,
    goalId: goal.id,
  }));
}

/** The goal document a conversion leaves behind: completed steps kept as history. */
export function remainingSubtasksAfterConversion(
  goal: Pick<Goal, "subtasks">,
): GoalSubtask[] {
  return goal.subtasks.filter((subtask) => subtask.done);
}
