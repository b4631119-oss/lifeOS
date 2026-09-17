import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
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
  NewTask,
  NewUserProfile,
  Note,
  TaskStatus,
  UserProfile,
} from "@/types/lifeos";

import { withCompletionStamp } from "./completionStamp";
import { getFirestoreDb } from "./firebase";
import { isEmptyNote, noteFromDocument } from "./notes.ts";
import { googleIdentityFields, normalizePreferredName } from "./profile.ts";
import { DEFAULT_PRIORITY, compareDayTasks } from "./taskSchedule.ts";
import { newTaskDoc, taskPatch } from "./taskPatch.ts";
import {
  legacySubtaskTaskDrafts,
  remainingSubtasksAfterConversion,
} from "./goals.ts";

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
    // Empty (or missing) times mean unscheduled, not an error — see `LifeTask`.
    startTime: (data.startTime as string) ?? "",
    endTime: (data.endTime as string) ?? "",
    status: (data.status as LifeTask["status"]) ?? "todo",
    // Absent on every document written before priorities existed: a task with
    // no priority is a medium one, not an unknown one.
    priority: (data.priority as LifeTask["priority"]) ?? DEFAULT_PRIORITY,
    date: (data.date as string) ?? "",
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    completedAt: (data.completedAt as Timestamp | null) ?? null,
    // Both absent on every document written before they existed. An empty
    // string is read as "no link" too, so neither shape can strand a task.
    goalId: (data.goalId as string | undefined) || undefined,
    // Absent on every document written before dropping existed.
    dropped: Boolean(data.dropped),
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

/** Anything with an id and data — a document or a query snapshot. */
type DocSnap = { id: string; data: () => DocumentData | undefined };

function mapGoal(snap: DocSnap): Goal {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    deadline: (data.deadline as string) ?? "",
    // Absent on every goal written before the lifecycle existed, and an old
    // goal is an active one.
    status: (data.status as Goal["status"]) ?? "active",
    subtasks: (data.subtasks as Goal["subtasks"]) ?? [],
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

/**
 * A note, mapped with the document id as its date.
 *
 * Shared by every note read so there is exactly one answer to "which day does
 * this note belong to" — see `noteFromDocument`.
 */
function mapNote(snap: DocSnap): Note {
  return noteFromDocument(snap.id, snap.data());
}

/* ------------------------------- user profile ------------------------------- */

/** Maps raw `users/{uid}` data, defaulting every field. */
function mapUserProfile(data: DocumentData): UserProfile {
  return {
    displayName: (data.displayName as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    photoURL: (data.photoURL as string | null) ?? null,
    // Absent on every document written before the local name existed, and an
    // absent local name means "use the Google one".
    preferredName: normalizePreferredName(data.preferredName as string | null),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
  };
}

/** The account document as stored, or `null` when it does not exist yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirestoreDb(), "users", uid));
  if (!snapshot.exists()) return null;

  return mapUserProfile(snapshot.data() ?? {});
}

/**
 * Creates `users/{uid}` on first sign-in, refreshes the Google-owned fields on
 * every later one, and returns what is stored.
 *
 * **The Google sync cannot touch `preferredName`.** The payload comes from
 * {@link googleIdentityFields}, whose type does not carry the field at all, and
 * the merge only writes what it is given — so a name the user set inside LifeOS
 * survives every future login. That is the whole reason the profile document
 * exists instead of the UI reading `user.displayName` directly.
 *
 * Returning the profile is not a convenience: the read is already made here to
 * know whether `createdAt` has to be stamped, so the caller gets the stored
 * value without a second round trip on the sign-in path.
 */
export async function ensureUserProfile(
  uid: string,
  google: NewUserProfile,
): Promise<UserProfile> {
  const ref = doc(getFirestoreDb(), "users", uid);
  const googleFields = googleIdentityFields(google);
  const existing = await getUserProfile(uid);

  if (!existing) {
    await setDoc(ref, { ...googleFields, createdAt: serverTimestamp() });
    // `createdAt` is a server timestamp and only resolves once the write lands,
    // so it is reported as unknown here rather than as this device's clock.
    return { ...googleFields, preferredName: null, createdAt: null };
  }

  await setDoc(ref, googleFields, { merge: true });
  return { ...existing, ...googleFields };
}

/**
 * Stores the name the user chose inside LifeOS, or clears it.
 *
 * `null` deletes the field instead of writing an empty string, so "reset to my
 * Google name" genuinely leaves no local choice behind — a stored `""` would be
 * indistinguishable from a name that failed to save.
 */
export async function setPreferredName(
  uid: string,
  name: string | null,
): Promise<void> {
  const preferredName = normalizePreferredName(name);

  await setDoc(
    doc(getFirestoreDb(), "users", uid),
    { preferredName: preferredName ?? deleteField() },
    { merge: true },
  );
}

/* ----------------------------------- tasks ---------------------------------- */

/**
 * Chronological across days, then by time within a day (unscheduled tasks last
 * — see `compareDayTasks`).
 */
function byDateThenTime(a: LifeTask, b: LifeTask): number {
  return a.date.localeCompare(b.date) || compareDayTasks(a, b);
}

/**
 * A **closed** range of `YYYY-MM-DD` days.
 *
 * Both ends are required, and that is the point: an open upper bound means "every
 * task this user will ever create", because `date` is in the future as soon as a
 * user plans ahead. Any read of a dated collection therefore has to name the last
 * day it cares about — a day view, a week view, an analytics window and the habit
 * history all know theirs.
 */
export type DateRange = { from: string; to: string };

/**
 * The one range query shape, shared by the read and the subscription.
 *
 * Both bounds sit on the same field (`date`), so this is a single-field range
 * scan: no composite index, and the result is exactly the days asked for.
 */
function taskRangeQuery(uid: string, range: DateRange) {
  return query(
    userCollection(uid, TASKS),
    where("date", ">=", range.from),
    where("date", "<=", range.to),
  );
}

/** One-shot read of the tasks dated inside `range`, oldest first. */
export async function getTaskRange(
  uid: string,
  range: DateRange,
): Promise<LifeTask[]> {
  const snapshot = await getDocs(taskRangeQuery(uid, range));
  return snapshot.docs.map(mapTask).sort(byDateThenTime);
}

/**
 * Subscribes to a day's tasks and pushes a sorted snapshot on every change.
 * Returns the Firestore unsubscribe function.
 */
export function subscribeToTasks(
  uid: string,
  date: string,
  onNext: (tasks: LifeTask[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, TASKS), where("date", "==", date)),
    (snapshot) => onNext(snapshot.docs.map(mapTask).sort(compareDayTasks)),
    (error) => onError?.(error),
  );
}

export async function addTask(uid: string, task: NewTask): Promise<string> {
  const ref = await addDoc(
    userCollection(uid, TASKS),
    newTaskDoc({
      ...task,
      // A task created already-done still needs a completion time, otherwise it
      // would never appear in the analytics hour histogram.
      completedAt: task.status === "done" ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<NewTask>,
  previousStatus?: TaskStatus,
): Promise<void> {
  // `taskPatch` is what keeps a title edit, a drag or a carry from wiping the
  // fields it never mentioned — the goal link in particular.
  await updateDoc(
    userDoc(uid, TASKS, taskId),
    taskPatch(withCompletionStamp(data, previousStatus)),
  );
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(userDoc(uid, TASKS, taskId));
}

/**
 * Subscribes to the tasks linked to one goal.
 *
 * A single-field equality query on `goalId`: no composite index, no second
 * collection, still inside `users/{uid}/tasks` where the owner-scoped rules
 * already apply, and it returns only the work that was actually linked — there
 * is nothing to filter afterwards and no list to keep in step with anything.
 */
export function subscribeToGoalTasks(
  uid: string,
  goalId: string,
  onNext: (tasks: LifeTask[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, TASKS), where("goalId", "==", goalId)),
    (snapshot) => onNext(snapshot.docs.map(mapTask).sort(byDateThenTime)),
    (error) => onError?.(error),
  );
}

/**
 * Subscribes to the tasks dated inside a **closed** range of days.
 *
 * Used by the Today view (a window of past days up to the day on screen) and by
 * the Week view (exactly its seven days). The upper bound is what keeps a day's
 * read to that day instead of to the user's whole future plan.
 */
export function subscribeToTaskRange(
  uid: string,
  range: DateRange,
  onNext: (tasks: LifeTask[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    taskRangeQuery(uid, range),
    (snapshot) => onNext(snapshot.docs.map(mapTask).sort(byDateThenTime)),
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

/** How many logs one delete pass collects — keeps each read bounded. */
const HABIT_LOG_PAGE = 300;

/**
 * Deletes every log of one habit, in bounded pages.
 *
 * Firestore has no "delete where", so the rows do have to be read first — but
 * not all at once: each pass collects at most {@link HABIT_LOG_PAGE} rows of
 * *this* habit, through a single-field equality query that needs no index, and
 * deletes them. Neither the read nor the write batch then grows with the length
 * of a user's history, and because a full page is followed by another pass, the
 * delete is complete: nothing is orphaned behind the removed habit.
 */
export async function deleteHabitLogs(
  uid: string,
  habitId: string,
): Promise<void> {
  for (;;) {
    const snapshot = await getDocs(
      query(
        userCollection(uid, HABIT_LOGS),
        where("habitId", "==", habitId),
        limit(HABIT_LOG_PAGE),
      ),
    );

    if (snapshot.empty) return;

    const batch = writeBatch(getFirestoreDb());
    for (const row of snapshot.docs) batch.delete(row.ref);
    await batch.commit();
  }
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

/**
 * Subscribes to the habit logs dated inside a **closed** range of days.
 *
 * `YYYY-MM-DD` sorts chronologically as a string, so this stays a single-field
 * range query and needs no composite index. The upper bound matters as much as it
 * does for tasks: the habit screen reads a bounded history — a year of streaks —
 * and neither its checks nor its streak computation may grow with the age of the
 * account.
 */
export function subscribeToHabitLogs(
  uid: string,
  range: DateRange,
  onNext: (logs: HabitLog[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    userCollection(uid, HABIT_LOGS),
    where("date", ">=", range.from),
    where("date", "<=", range.to),
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

/**
 * Deletes a goal document — and nothing else.
 *
 * The hooks in `useGoalTasks` deliberately stop here: a linked task is the
 * user's own work, so ending a direction must not delete a day of it. The link
 * simply stops resolving, and the UI shows those tasks as having no goal.
 */
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

/**
 * Subscribes to a single goal document.
 *
 * Reports `null` once the goal is gone instead of failing: an open detail page
 * and a task that still points at a deleted goal both have to keep working.
 */
export function subscribeToGoal(
  uid: string,
  goalId: string,
  onNext: (goal: Goal | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid, GOALS, goalId),
    (snapshot) => onNext(snapshot.exists() ? mapGoal(snapshot) : null),
    (error) => onError?.(error),
  );
}

/**
 * Turns a goal's remaining pre-task steps into real tasks for `date`.
 *
 * One atomic batch: either every open step becomes a task and the goal keeps
 * only its completed steps, or nothing changes at all — there is no half-moved
 * goal to clean up by hand.
 *
 * Completed steps are deliberately not converted. They were finished at a
 * moment nobody recorded, so a task marked done today would invent that history
 * (and land in today's completion rate).
 *
 * Returns how many tasks were created.
 */
export async function moveLegacySubtasksToTasks(
  uid: string,
  goal: Goal,
  date: string,
): Promise<number> {
  const drafts = legacySubtaskTaskDrafts(goal, date);
  if (drafts.length === 0) return 0;

  const batch = writeBatch(getFirestoreDb());

  for (const draft of drafts) {
    batch.set(doc(userCollection(uid, TASKS)), {
      ...newTaskDoc(draft),
      completedAt: null,
      createdAt: serverTimestamp(),
    });
  }

  batch.update(userDoc(uid, GOALS, goal.id), {
    subtasks: remainingSubtasksAfterConversion(goal),
  });

  await batch.commit();

  return drafts.length;
}

/* ----------------------------------- notes ---------------------------------- */

/**
 * One day's note, read **by its document id**.
 *
 * A note lives at `users/{uid}/notes/{YYYY-MM-DD}`, so today's note needs no
 * query at all — its address is already known. This is deliberately not the
 * "read every note and find the one whose `date` field matches" that came
 * before: that also pulled the entire history over the wire to open a single
 * day, and it missed any document without a `date` field, which made an existing
 * note look like it had been lost.
 *
 * Returns `null` for a day with no note yet, which is the normal first-use case
 * rather than an error.
 */
export async function getNote(uid: string, date: string): Promise<Note | null> {
  const snapshot = await getDoc(userDoc(uid, NOTES, date));
  if (!snapshot.exists()) return null;

  return mapNote(snapshot);
}

/**
 * The newest notes, newest first, at most `max` of them.
 *
 * Ordered by **document id** rather than by a `date` field, which is the same
 * thing for a note (`2026-09-17` sorts chronologically as a string) but has two
 * real advantages: it needs no index, and it lists documents written before the
 * `date` field existed, which an equality/range query on that field would have
 * skipped. Since ids are dates, descending id order is newest-first.
 *
 * Bounded on purpose — the history is a page of recent entries, not the user's
 * whole journal in memory.
 */
export async function getRecentNotes(
  uid: string,
  max: number,
): Promise<Note[]> {
  const snapshot = await getDocs(
    query(
      userCollection(uid, NOTES),
      orderBy(documentId(), "desc"),
      limit(max),
    ),
  );

  return snapshot.docs.map(mapNote);
}

/**
 * Creates, updates or **deletes** the note for `date`.
 *
 * The document id *is* the date (`users/{uid}/notes/2026-09-15`), so there can
 * only ever be one note per day: a save can never race a second document into
 * existence, and the day's note needs no query to be found — its id is known.
 *
 * Empty text deletes the document instead of storing `content: ""`. An emptied
 * editor means "no note", and an empty document cannot be shown, read or
 * removed anywhere: it would sit in the history for ever as "Empty note". So
 * this is the one write whose result is a deletion, and the caller is expected
 * to treat existence as following the text (see `useNotes`).
 *
 * `merge: true` keeps a write additive — it never clobbers a field it does not
 * carry, which also means a save stays harmless if the initial read failed and
 * left us unsure whether the note already exists. Pass `isNew` only when that
 * note is known to be absent, so it gets its creation time; later saves must not
 * restamp it.
 */
export async function saveNote(
  uid: string,
  date: string,
  content: string,
  isNew = false,
): Promise<void> {
  if (isEmptyNote(content)) {
    await deleteDoc(userDoc(uid, NOTES, date));
    return;
  }

  await setDoc(
    userDoc(uid, NOTES, date),
    {
      date,
      content,
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}

export async function deleteNote(uid: string, noteId: string): Promise<void> {
  await deleteDoc(userDoc(uid, NOTES, noteId));
}
