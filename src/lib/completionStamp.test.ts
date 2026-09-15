import assert from "node:assert/strict";
import { test } from "node:test";

import { FieldValue, Timestamp } from "firebase/firestore";

import { withCompletionStamp } from "./completionStamp.ts";

/** A previously recorded completion time, as Firestore would hand it back. */
const STORED_COMPLETED_AT = Timestamp.fromMillis(Date.UTC(2026, 0, 15, 9, 30));

/** `serverTimestamp()` resolves to a `FieldValue` sentinel before it hits Firestore. */
function isServerTimestamp(value: unknown): boolean {
  return value instanceof FieldValue;
}

test("a status-less update (dragging a block on the Schedule) leaves completedAt alone", () => {
  const update = { startTime: "10:30", endTime: "11:15" };

  const patch = withCompletionStamp(update, "done");

  assert.deepEqual(patch, update);
  assert.ok(!("completedAt" in patch), "no completedAt key is added");
});

test("moving a task off done clears its completedAt", () => {
  const patch = withCompletionStamp(
    { status: "todo", completedAt: STORED_COMPLETED_AT },
    "done",
  );

  assert.equal(patch.status, "todo");
  assert.equal(patch.completedAt, null);
});

test("re-saving an already done task preserves its original completedAt", () => {
  // A plain edit (rename, typo fix) sends no completion time, so Firestore keeps
  // the stored one — and crucially it is not restamped with "now".
  const patch = withCompletionStamp(
    { status: "done", title: "Fixed a typo" },
    "done",
  );

  assert.deepEqual(patch, { status: "done", title: "Fixed a typo" });
  assert.ok(!("completedAt" in patch), "the stored completion time survives untouched");

  // When the caller does pass the current value through, it is kept by identity.
  const passedThrough = withCompletionStamp(
    { status: "done", completedAt: STORED_COMPLETED_AT },
    "done",
  );
  assert.equal(passedThrough.completedAt, STORED_COMPLETED_AT);
});

test("the first transition to done stamps a new completion time", () => {
  const reopenedThenDone = withCompletionStamp({ status: "done" }, "in_progress");
  assert.ok(isServerTimestamp(reopenedThenDone.completedAt));

  const neverStamped = withCompletionStamp({ status: "done" }, undefined);
  assert.ok(isServerTimestamp(neverStamped.completedAt));
});
