import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import type {
  Goal,
  Habit,
  HabitLog,
  LifeTask,
  NewGoal,
  NewHabit,
  NewHabitLog,
  NewNote,
  NewTask,
  NewUserProfile,
  Note,
  TaskStatus,
  UserProfile,
} from "@/types/lifeos";

import { withCompletionStamp } from "./completionStamp";
import { getFirestoreDb } from "./firebase";

/** Subcollection names under `users/{uid}`. */
const TASKS = "tasks";
const HABITS = "habits";
const HABIT_LOGS = "habitLogs";
const GOALS = "goals";
const NOTES = "notes";

function userCollection(uid: string, name: string) {
  return collection(getFirestoreDb(), "users", uid, name);
}

function userDoc(uid: string, name: string, id: string) {
  return doc(getFirestoreDb(), "users", uid, name, id);
}

type Snap = QueryDocumentSnapshot<DocumentData>;

/* ---------------------------------- mappers --------------------------------- */

function mapTask(snap: Snap): LifeTask {
  const data = snap.data();
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    startTime: (data.startTime as string) ?? "",
    endTime: (data.endTime as string) ?? "",
    status: (data.status as LifeTask["status"]) ?? "todo",
    date: (data.date as string) ?? "",
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    completedAt: (data.completedAt as Timestamp | null) ?? null,
  };
}

function mapHabit(snap: Snap): Habit {
  const data = snap.data();
  return {
    id: snap.id,
    name: (data.name as string) ?? "",
    active: Boolean(data.active),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

function mapHabitLog(snap: Snap): HabitLog {
  const data = snap.data();
  return {
    id: snap.id,
    habitId: (data.habitId as string) ?? "",
    date: (data.date as string) ?? "",
    done: Boolean(data.done),
  };
}

function mapGoal(snap: Snap): Goal {
  const data = snap.data();
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    deadline: (data.deadline as string) ?? "",
    subtasks: (data.subtasks as Goal["subtasks"]) ?? [],
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

function mapNote(snap: Snap): Note {
  const data = snap.data();
  return {
    id: snap.id,
    date: (data.date as string) ?? "",
    content: (data.content as string) ?? "",
    aiSummary: (data.aiSummary as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

/* ------------------------------- user profile ------------------------------- */

/** Creates `users/{uid}` on first sign-in and refreshes the public fields afterwards. */
export async function ensureUserProfile(
  uid: string,
  profile: NewUserProfile,
): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
    return;
  }

  await setDoc(ref, profile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirestoreDb(), "users", uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    displayName: (data.displayName as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    photoURL: (data.photoURL as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

/* ----------------------------------- tasks ---------------------------------- */

/**
 * Returns tasks scheduled on or after `fromDate` (`YYYY-MM-DD`), oldest first.
 *
 * `YYYY-MM-DD` sorts chronologically as a string, so this stays a single-field
 * range query and needs no composite index (same shape as
 * {@link subscribeToHabitLogs}).
 */
export async function getTasksSince(
  uid: string,
  fromDate: string,
): Promise<LifeTask[]> {
  const snapshot = await getDocs(
    query(userCollection(uid, TASKS), where("date", ">=", fromDate)),
  );

  return snapshot.docs.map(mapTask).sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
}

/**
 * Returns tasks, optionally filtered to a single day, sorted by start time.
 */
export async function getTasks(uid: string, date?: string): Promise<LifeTask[]> {
  const source = date
    ? query(userCollection(uid, TASKS), where("date", "==", date))
    : userCollection(uid, TASKS);

  const snapshot = await getDocs(source);
  return snapshot.docs
    .map(mapTask)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function addTask(uid: string, task: NewTask): Promise<string> {
  const ref = await addDoc(userCollection(uid, TASKS), {
    ...task,
    // A task created already-done still needs a completion time, otherwise it
    // would never appear in the analytics hour histogram.
    completedAt: task.status === "done" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<NewTask>,
  previousStatus?: TaskStatus,
): Promise<void> {
  await updateDoc(
    userDoc(uid, TASKS, taskId),
    withCompletionStamp(data, previousStatus),
  );
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(userDoc(uid, TASKS, taskId));
}

/**
 * Subscribes to a day's tasks and pushes a sorted snapshot on every change.
 * Returns the Firestore unsubscribe function.
 */
export function subscribeToTasks(
  uid: string,
  date: string | undefined,
  onNext: (tasks: LifeTask[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = date
    ? query(userCollection(uid, TASKS), where("date", "==", date))
    : userCollection(uid, TASKS);

  return onSnapshot(
    source,
    (snapshot) => {
      const tasks = snapshot.docs
        .map(mapTask)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      onNext(tasks);
    },
    (error) => onError?.(error),
  );
}

/* ---------------------------------- habits ---------------------------------- */

export async function getHabits(
  uid: string,
  activeOnly = false,
): Promise<Habit[]> {
  const source = activeOnly
    ? query(userCollection(uid, HABITS), where("active", "==", true))
    : userCollection(uid, HABITS);

  const snapshot = await getDocs(source);
  return snapshot.docs.map(mapHabit);
}

export async function addHabit(uid: string, habit: NewHabit): Promise<string> {
  const ref = await addDoc(userCollection(uid, HABITS), {
    ...habit,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateHabit(
  uid: string,
  habitId: string,
  data: Partial<NewHabit>,
): Promise<void> {
  await updateDoc(userDoc(uid, HABITS, habitId), data);
}

export async function deleteHabit(uid: string, habitId: string): Promise<void> {
  await deleteDoc(userDoc(uid, HABITS, habitId));
}

/** Subscribes to all of the user's habits, active and archived. */
export function subscribeToHabits(
  uid: string,
  onNext: (habits: Habit[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userCollection(uid, HABITS),
    (snapshot) => onNext(snapshot.docs.map(mapHabit)),
    (error) => onError?.(error),
  );
}

/* -------------------------------- habit logs -------------------------------- */

export async function getHabitLogs(
  uid: string,
  date?: string,
): Promise<HabitLog[]> {
  const source = date
    ? query(userCollection(uid, HABIT_LOGS), where("date", "==", date))
    : userCollection(uid, HABIT_LOGS);

  const snapshot = await getDocs(source);
  return snapshot.docs.map(mapHabitLog);
}

export async function addHabitLog(
  uid: string,
  log: NewHabitLog,
): Promise<string> {
  const ref = await addDoc(userCollection(uid, HABIT_LOGS), { ...log });
  return ref.id;
}

export async function updateHabitLog(
  uid: string,
  logId: string,
  data: Partial<NewHabitLog>,
): Promise<void> {
  await updateDoc(userDoc(uid, HABIT_LOGS, logId), data);
}

export async function deleteHabitLog(
  uid: string,
  logId: string,
): Promise<void> {
  await deleteDoc(userDoc(uid, HABIT_LOGS, logId));
}

/**
 * Subscribes to habit logs on or after `fromDate` (`YYYY-MM-DD`).
 *
 * `YYYY-MM-DD` sorts chronologically as a string, so this stays a single-field
 * range query and needs no composite index.
 */
export function subscribeToHabitLogs(
  uid: string,
  fromDate: string,
  onNext: (logs: HabitLog[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    userCollection(uid, HABIT_LOGS),
    where("date", ">=", fromDate),
  );

  return onSnapshot(
    source,
    (snapshot) => onNext(snapshot.docs.map(mapHabitLog)),
    (error) => onError?.(error),
  );
}

/* ----------------------------------- goals ---------------------------------- */

export async function getGoals(uid: string): Promise<Goal[]> {
  const snapshot = await getDocs(userCollection(uid, GOALS));
  return snapshot.docs.map(mapGoal);
}

export async function addGoal(uid: string, goal: NewGoal): Promise<string> {
  const ref = await addDoc(userCollection(uid, GOALS), {
    ...goal,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  data: Partial<NewGoal>,
): Promise<void> {
  await updateDoc(userDoc(uid, GOALS, goalId), data);
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  await deleteDoc(userDoc(uid, GOALS, goalId));
}

/** Subscribes to all of the user's goals. */
export function subscribeToGoals(
  uid: string,
  onNext: (goals: Goal[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userCollection(uid, GOALS),
    (snapshot) => onNext(snapshot.docs.map(mapGoal)),
    (error) => onError?.(error),
  );
}

/* ----------------------------------- notes ---------------------------------- */

export async function getNotes(uid: string, date?: string): Promise<Note[]> {
  const source = date
    ? query(userCollection(uid, NOTES), where("date", "==", date))
    : userCollection(uid, NOTES);

  const snapshot = await getDocs(source);
  return snapshot.docs.map(mapNote);
}

/**
 * Creates or updates the note for `date`.
 *
 * The document id *is* the date (`users/{uid}/notes/2026-09-15`), so there can
 * only ever be one note per day: a save can never race a second document into
 * existence, and today's note needs no query to be found — its id is known.
 *
 * `merge: true` keeps the write additive — it never clobbers a field it does not
 * carry (the AI summary, say), which also means a save stays harmless if the
 * initial read failed and left us unsure whether the note already exists.
 * Pass `isNew` only when that note is known to be absent, so it gets its
 * creation time; later saves must not restamp it.
 */
export async function saveNote(
  uid: string,
  date: string,
  content: string,
  isNew = false,
): Promise<void> {
  await setDoc(
    userDoc(uid, NOTES, date),
    {
      date,
      content,
      ...(isNew ? { aiSummary: null, createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}

export async function updateNote(
  uid: string,
  noteId: string,
  data: Partial<NewNote>,
): Promise<void> {
  await updateDoc(userDoc(uid, NOTES, noteId), data);
}

export async function deleteNote(uid: string, noteId: string): Promise<void> {
  await deleteDoc(userDoc(uid, NOTES, noteId));
}
