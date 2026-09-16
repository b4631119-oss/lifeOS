import type { LifeTask, NewTask, TaskPriority } from "@/types/lifeos";

import { nextDayKey, toMinutes } from "./date.ts";

/**
 * The scheduling rules of a LifeOS day, as plain functions.
 *
 * Times are optional: a task captured from the quick-add field carries only a
 * title, and `startTime`/`endTime` stay empty strings until the user gives it a
 * slot. Everything that has to know what "scheduled" means — the form, the day
 * list, the Schedule, the recovery flow — asks here instead of testing the two
 * strings itself, so the rule can only be wrong in one place.
 *
 * No React and no Firebase in this module, so it is directly testable
 * (`taskSchedule.test.ts`), the same way `lib/habits.ts` holds the streak rules.
 */

/** Just the two fields the rules need, so they also apply to a form draft. */
export type TaskTimes = Pick<LifeTask, "startTime" | "endTime">;

/** A task is scheduled when it carries a readable start *and* end. */
export function isScheduled(task: TaskTimes): boolean {
  return toMinutes(task.startTime) !== null && toMinutes(task.endTime) !== null;
}

export type TimeRangeError = "incomplete" | "order";

/**
 * Validates an optional time range for the task form.
 *
 * Empty/empty is **valid** and means unscheduled — that is the fast path this
 * whole flow exists for. A half-filled pair is not: a task with a start and no
 * end can never be "late", and the Schedule has no honest height to give it.
 */
export function timeRangeError(
  start: string,
  end: string,
): TimeRangeError | null {
  const hasStart = start.trim() !== "";
  const hasEnd = end.trim() !== "";

  if (!hasStart && !hasEnd) return null;

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (!hasStart || !hasEnd || startMinutes === null || endMinutes === null) {
    return "incomplete";
  }

  if (endMinutes <= startMinutes) return "order";

  return null;
}

/**
 * How much of the day is spoken for, in minutes: the durations of the scheduled
 * tasks, ignoring dropped ones.
 *
 * Deliberately the *only* number the app claims about the day. There is no
 * "available time" source in LifeOS (no working-hours setting), and inventing
 * one would produce a capacity warning that means nothing.
 */
export function plannedMinutes(tasks: LifeTask[]): number {
  let total = 0;

  for (const task of tasks) {
    if (task.dropped) continue;

    const start = toMinutes(task.startTime);
    const end = toMinutes(task.endTime);
    if (start === null || end === null || end <= start) continue;

    total += end - start;
  }

  return total;
}

/** Tasks with no time at all — the day's untimed backlog. */
export function unscheduledTasks(tasks: LifeTask[]): LifeTask[] {
  return tasks.filter((task) => !isScheduled(task));
}

/**
 * The tasks that count towards a day's completion metrics.
 *
 * A dropped task was consciously taken off the plan, so it is neither a success
 * nor a failure and must not sit in the denominator — otherwise the recovery
 * flow would leave the user with a number they cannot explain.
 */
export function tasksInPlan(tasks: LifeTask[]): LifeTask[] {
  return tasks.filter((task) => !task.dropped);
}

/* --------------------------------- priority -------------------------------- */

/** Most important first — the order the untimed part of a day is listed in. */
export const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

/** What a task counts as when it has no priority (every task written before it). */
export const DEFAULT_PRIORITY: TaskPriority = "medium";

/** A task's priority, defaulted rather than guessed per caller. */
export function priorityOf(task: Pick<LifeTask, "priority">): TaskPriority {
  return task.priority ?? DEFAULT_PRIORITY;
}

/** Sort rank for a priority: `0` is the most important, and unknown reads as medium. */
export function priorityRank(priority: TaskPriority): number {
  const rank = PRIORITIES.indexOf(priority);
  return rank === -1 ? PRIORITIES.indexOf(DEFAULT_PRIORITY) : rank;
}

/**
 * Day-list order: scheduled tasks by start time, untimed ones after them.
 *
 * Untimed work is a backlog for the day rather than a slot in it, and an empty
 * `startTime` would otherwise sort it above everything else. Within that backlog
 * priority decides the order, because there is no hour to decide it: that is
 * the one place priority may reorder a day, and it never moves a task that has
 * a real slot.
 */
export function compareDayTasks(a: LifeTask, b: LifeTask): number {
  const aStart = toMinutes(a.startTime);
  const bStart = toMinutes(b.startTime);

  if (aStart === null && bStart === null) {
    return priorityRank(priorityOf(a)) - priorityRank(priorityOf(b));
  }
  if (aStart === null) return 1;
  if (bStart === null) return -1;

  return aStart - bStart;
}

/* ------------------------------- current / next ------------------------------ */

export type CurrentAndNext = {
  /** Scheduled work that is happening right now, if any. */
  current: LifeTask | null;
  /** The scheduled task that has not started yet and comes first. */
  next: LifeTask | null;
};

/**
 * What the day is doing at `nowMinutes` (minutes since local midnight).
 *
 * Only scheduled, open, non-dropped tasks take part: an unscheduled task has no
 * hour to be current in, and giving it one would resurrect the time the user
 * never set. This is a reading of existing fields, not a new status system.
 */
export function currentAndNextTasks(
  tasks: LifeTask[],
  nowMinutes: number,
): CurrentAndNext {
  let current: LifeTask | null = null;
  let currentStart = Number.POSITIVE_INFINITY;
  let next: LifeTask | null = null;
  let nextStart = Number.POSITIVE_INFINITY;

  for (const task of tasks) {
    if (task.dropped || task.status === "done") continue;

    const start = toMinutes(task.startTime);
    const end = toMinutes(task.endTime);
    if (start === null || end === null || end <= start) continue;

    if (start <= nowMinutes && nowMinutes < end) {
      if (start < currentStart) {
        current = task;
        currentStart = start;
      }
    } else if (start > nowMinutes && start < nextStart) {
      next = task;
      nextStart = start;
    }
  }

  return { current, next };
}

/* ------------------------------ unfinished work ----------------------------- */

export type DayGroup = { date: string; tasks: LifeTask[] };

/**
 * Unfinished work from *earlier* days, newest day first.
 *
 * "Unfinished" is: dated before the day being looked at, still open, and not
 * dropped. Nothing is carried automatically — this is exactly the list the
 * recovery panel offers to carry, reschedule or drop, derived from the same
 * tasks collection rather than a second list that could drift from it.
 *
 * `YYYY-MM-DD` compares correctly as a string, so no date parsing is needed.
 */
export function groupUnfinishedByDay(
  tasks: LifeTask[],
  beforeDate: string,
): DayGroup[] {
  const groups = new Map<string, LifeTask[]>();

  for (const task of tasks) {
    if (task.dropped) continue;
    if (task.status === "done") continue;
    if (task.date >= beforeDate) continue;

    const bucket = groups.get(task.date);
    if (bucket) bucket.push(task);
    else groups.set(task.date, [task]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayTasks]) => ({
      date,
      tasks: dayTasks.sort(compareDayTasks),
    }));
}

/* --------------------------------- recovery --------------------------------- */

/**
 * Caps a grouped list for display, keeping the newest groups whole.
 *
 * The recovery panel must not turn into a wall of old tasks: the most recent
 * day comes first, and whatever is left over is counted so the user knows to
 * reach the older days through the day arrows instead.
 */
export function limitGroups(
  groups: DayGroup[],
  limit: number,
): { groups: DayGroup[]; hidden: number } {
  const shown: DayGroup[] = [];
  let remaining = Math.max(0, limit);

  for (const group of groups) {
    if (remaining === 0) break;

    const tasks = group.tasks.slice(0, remaining);
    shown.push({ date: group.date, tasks });
    remaining -= tasks.length;
  }

  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);
  const visible = shown.reduce((sum, group) => sum + group.tasks.length, 0);

  return { groups: shown, hidden: total - visible };
}

/**
 * Where "carry to tomorrow" sends a task: the day after the one on screen.
 *
 * The write is absolute (a date, not a "+1 day" instruction), so pressing the
 * button twice sends the same date again instead of skipping a day — a recovery
 * action has to be safe to repeat.
 */
export function carryTargetDate(dayKey: string): string {
  return nextDayKey(dayKey);
}

/**
 * Taking a task off the plan leaves everything else about it alone: no delete,
 * no status change, no lost history. It stays on its own day and is only left
 * out of the completion metrics and the unfinished list.
 */
export const DROP_PATCH: Partial<NewTask> = { dropped: true };

/* --------------------------------- duration --------------------------------- */

/** Minutes split into whole hours and the remaining minutes. */
export function splitDuration(minutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.round(minutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}
