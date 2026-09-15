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

export type LifeTask = {
  id: string;
  title: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  status: TaskStatus;
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
  subtasks: GoalSubtask[];
  createdAt: Timestamp | null;
};

/** users/{uid}/notes/{noteId} */
export type Note = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  content: string;
  aiSummary: string | null;
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
