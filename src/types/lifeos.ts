import type { Timestamp } from "firebase/firestore";

/**
 * Firestore data model for LifeOS.
 *
 * Everything lives under `users/{uid}/...` so that a single set of security
 * rules can scope access to the owner (see `firestore.rules`).
 */

/** users/{uid} */
export type UserProfile = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Timestamp | null;
};

/** users/{uid}/tasks/{taskId} */
export type TaskStatus = "todo" | "in_progress" | "done";

/** Ordering hint for tasks that have no time — see `compareDayTasks`. */
export type TaskPriority = "low" | "medium" | "high";

export type LifeTask = {
  id: string;
  title: string;
  /**
   * Scheduled window, `"HH:mm"`.
   *
   * Both are empty strings on an *unscheduled* task — one captured with a title
   * only. That empty pair is the entire representation: there is no separate
   * `scheduled` flag and no second entity, so tasks written before times became
   * optional keep working untouched (a full pair simply means scheduled). Ask
   * `isScheduled()` in `lib/taskSchedule` rather than testing the strings here.
   */
  startTime: string;
  /** See `startTime`. */
  endTime: string;
  status: TaskStatus;
  /**
   * How much this task matters, among tasks that have no time to be ordered by.
   *
   * Required in the mapped type and defaulted to `"medium"` for documents
   * written before it existed, so no reader has to guess. It orders the
   * unscheduled part of a day and the "next action" of a goal — it does not
   * rewrite the day's timeline (a scheduled task still sorts by its hour).
   */
  priority: TaskPriority;
  /** YYYY-MM-DD */
  date: string;
  createdAt: Timestamp | null;
  /**
   * When the task was marked done, or `null` while it is open.
   *
   * Optional so it stays additive: documents written before this field existed
   * simply have no completion time (the analytics hour histogram skips them
   * rather than guessing from `startTime`, which is scheduled, not actual).
   */
  completedAt?: Timestamp | null;
  /**
   * The goal this task is concrete work for, or absent when it stands alone.
   *
   * Optional by design: a task without it is perfectly valid, most are, and
   * nothing migrates old documents. The id is the only link that exists — no
   * copy of the goal lives on the task, and a deleted goal simply leaves the
   * link dangling (the UI shows it as a task with no goal rather than breaking).
   */
  goalId?: string;
  /**
   * True once the user deliberately took the task off the active plan ("drop"
   * in the unfinished-task recovery flow).
   *
   * Additive and optional: documents written before this field existed have no
   * such key and read as `false`. Dropping is not deleting — the task keeps its
   * title, status and date, stays visible on its own day, and is only excluded
   * from the completion metrics and from the unfinished list.
   */
  dropped?: boolean;
};

/** users/{uid}/habits/{habitId} */
export type Habit = {
  id: string;
  name: string;
  active: boolean;
  createdAt: Timestamp | null;
};

/** users/{uid}/habitLogs/{logId} */
export type HabitLog = {
  id: string;
  habitId: string;
  /** YYYY-MM-DD */
  date: string;
  done: boolean;
};

/** users/{uid}/goals/{goalId} */
export type GoalSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Goal = {
  id: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  deadline: string;
  /**
   * Where the goal sits in its own life: active, completed or archived.
   *
   * Required in the mapped type and defaulted to `"active"` for documents
   * written before the field existed, so every goal has a state and none of them
   * silently disappears. Completed and archived goals are still listed (and
   * still keep their linked tasks) — they only stop being offered for new work.
   */
  status: GoalStatus;
  /**
   * **Legacy.** The pre-task checklist a goal used to carry, kept so old goals
   * lose nothing: it is no longer editable, and `Move open steps to tasks`
   * turns the open ones into real tasks (leaving the completed ones here as
   * history). Real work is a `LifeTask` with a `goalId`.
   */
  subtasks: GoalSubtask[];
  createdAt: Timestamp | null;
};

/**
 * The three states a goal can be in. Deliberately three: anything more would be
 * a project-management system, and a goal here is a direction, not a workflow.
 */
export type GoalStatus = "active" | "completed" | "archived";

/** users/{uid}/notes/{noteId} — the document id is the date. */
export type Note = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  content: string;
  createdAt: Timestamp | null;
};

/** Payloads accepted when creating new documents (`id`/`createdAt` are set by Firestore). */
export type NewUserProfile = Pick<
  UserProfile,
  "displayName" | "email" | "photoURL"
>;
export type NewTask = Omit<LifeTask, "id" | "createdAt">;
export type NewHabit = Omit<Habit, "id" | "createdAt">;
export type NewHabitLog = Omit<HabitLog, "id">;
export type NewGoal = Omit<Goal, "id" | "createdAt">;
export type NewNote = Omit<Note, "id" | "createdAt">;
