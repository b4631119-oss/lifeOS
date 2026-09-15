import { serverTimestamp } from "firebase/firestore";

import type { NewTask, TaskStatus } from "@/types/lifeos";

/**
 * Keeps `completedAt` in step with `status`, in the one place every status
 * change funnels through — the list checkbox and the form's status select both
 * end up here, so neither has to remember to record the moment itself.
 *
 * Only acts when `status` is part of the update, so time-only edits (dragging a
 * block on the Schedule) leave the existing completion time untouched.
 *
 * `previousStatus` matters: re-saving an already finished task (renaming it,
 * fixing a typo) must not restamp it, or every later edit would drift the task
 * to the hour of the edit in the analytics histogram.
 *
 * Lives in its own module (rather than next to `updateTask`) so it stays a pure
 * function with no Firestore connection behind it — see
 * `completionStamp.test.ts`.
 */
export function withCompletionStamp(
  data: Partial<NewTask>,
  previousStatus: TaskStatus | undefined,
) {
  if (!("status" in data)) return data;

  // Moving off done: the completion time no longer applies.
  if (data.status !== "done") return { ...data, completedAt: null };

  if (previousStatus === "done") return data;

  return { ...data, completedAt: serverTimestamp() };
}
