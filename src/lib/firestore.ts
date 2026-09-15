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
function userCollection(uid: string, name: string) {
  return collection(getFirestoreDb(), "users", uid, name);
}

function userDoc(uid: string, name: string, id: string) {
  return doc(getFirestoreDb(), "users", uid, name, id);
}

type Snap = QueryDocumentSnapshot<DocumentData>;

/* ---------------------------------- mappers --------------------------------- */

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