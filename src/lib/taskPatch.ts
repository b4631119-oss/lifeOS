import { deleteField } from "firebase/firestore";

import type { NewTask } from "@/types/lifeos";

/**
 * Turns a task patch into what Firestore should actually receive.
 *
 * Two different nothings have to stay different:
 *
 * - **A key that is absent** means "leave this field alone". A title edit, a
 *   drag, a carry, a status toggle and a priority change all send a partial
 *   patch, and none of them may quietly wipe the goal link, the day or the
 *   time as a side effect.
 * - **A key explicitly set to `undefined`** means "remove this field" — that is
 *   how the form unlinks a goal. Firestore rejects `undefined` outright, so it
 *   is translated to its `deleteField()` sentinel here, in the one place every
 *   write goes through.
 */

/**
 * Task fields as they go *towards* Firestore, where a value may also be a
 * sentinel (`deleteField()` for an unlink, `serverTimestamp()` for a completion
 * time) rather than the type the mapped task carries back.
 */
export type TaskWrite = Partial<Record<keyof NewTask, unknown>> & {
  createdAt?: unknown;
};

/** A partial task update, ready for `updateDoc`. */
export function taskPatch(data: TaskWrite): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    patch[key] = value === undefined ? deleteField() : value;
  }

  return patch;
}

/**
 * A new task document, with the keys that were never set left out entirely —
 * `addDoc` would otherwise throw on an `undefined` goal id.
 */
export function newTaskDoc(task: TaskWrite): Record<string, unknown> {
  const document: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(task)) {
    if (value !== undefined) document[key] = value;
  }

  return document;
}
