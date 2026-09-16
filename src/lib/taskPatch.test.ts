import assert from "node:assert/strict";
import { test } from "node:test";

import { FieldValue } from "firebase/firestore";

import { newTaskDoc, taskPatch } from "./taskPatch.ts";

/** `deleteField()` resolves to a `FieldValue` sentinel before it hits Firestore. */
function isDeleteField(value: unknown): boolean {
  return value instanceof FieldValue;
}

test("a patch only carries the fields it was given", () => {
  // The whole point: an edit that says nothing about the goal link, the day or
  // the priority must not be able to wipe them. Absent keys stay absent, so
  // Firestore leaves those fields untouched.
  const patch = taskPatch({ title: "Fixed a typo" });

  assert.deepEqual(patch, { title: "Fixed a typo" });
  for (const field of ["goalId", "date", "startTime", "endTime", "priority"]) {
    assert.ok(!(field in patch), `${field} must not be in the patch`);
  }
});

test("rescheduling, carrying and dropping leave the goal link out of the patch", () => {
  // These are the exact patches the recovery flow and the Schedule send.
  assert.deepEqual(taskPatch({ date: "2026-09-17", startTime: "14:00", endTime: "14:30" }), {
    date: "2026-09-17",
    startTime: "14:00",
    endTime: "14:30",
  });
  assert.deepEqual(taskPatch({ dropped: true }), { dropped: true });
  assert.deepEqual(taskPatch({ status: "done" }), { status: "done" });
});

test("an explicit undefined removes the field", () => {
  // Choosing "No goal" unlinks the task; Firestore needs the sentinel, because
  // it rejects a plain `undefined` value.
  const patch = taskPatch({ goalId: undefined });

  assert.ok("goalId" in patch);
  assert.ok(isDeleteField(patch.goalId));
});

test("a new task document drops the keys that were never set", () => {
  const document = newTaskDoc({
    title: "Позвонить клиенту",
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "high",
    date: "2026-09-16",
    goalId: undefined,
  });

  assert.deepEqual(document, {
    title: "Позвонить клиенту",
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "high",
    date: "2026-09-16",
  });
});

test("a new task document keeps the goal link when there is one", () => {
  const document = newTaskDoc({
    title: "Позвонить клиенту",
    startTime: "",
    endTime: "",
    status: "todo",
    priority: "medium",
    date: "2026-09-16",
    goalId: "goal-1",
  });

  assert.equal(document.goalId, "goal-1");
});
