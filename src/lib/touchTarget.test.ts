import assert from "node:assert/strict";
import { test } from "node:test";

import {
  declaredHeightPx,
  meetsTouchTarget,
  MIN_TOUCH_TARGET_PX,
  TEXT_ACTION_HIT_AREA,
} from "./touchTarget.ts";

test("the text action clears the 44px minimum", () => {
  // The regression this guards: the secondary action under the capture field
  // was a compact line of text with `py-1.5` — 30px tall, which is right for the
  // type and wrong for a thumb.
  assert.equal(meetsTouchTarget(TEXT_ACTION_HIT_AREA), true);
  assert.equal(declaredHeightPx(TEXT_ACTION_HIT_AREA), MIN_TOUCH_TARGET_PX);
});

test("a compact label with 30px of text and padding is not a touch target", () => {
  assert.equal(meetsTouchTarget("rounded py-1.5 text-theme-xs"), false);
});

test("40px is still short of the minimum", () => {
  assert.equal(meetsTouchTarget("min-h-10"), false);
});

test("heights are read from the utilities that pin one", () => {
  assert.equal(declaredHeightPx("min-h-11"), 44);
  assert.equal(declaredHeightPx("h-11"), 44);
  assert.equal(declaredHeightPx("min-h-[44px]"), 44);
  assert.equal(declaredHeightPx("min-h-[2.75rem]"), 44);
});

test("the tallest stated height wins when both are present", () => {
  assert.equal(declaredHeightPx("h-8 min-h-11"), 44);
});

test("heights in units that are not px or rem say nothing about the target", () => {
  assert.equal(declaredHeightPx("h-full min-h-screen"), null);
  assert.equal(meetsTouchTarget("h-auto"), false);
});

test("colours, padding and type are ignored rather than guessed at", () => {
  assert.equal(
    declaredHeightPx("rounded px-3 py-2 text-theme-sm text-brand-600"),
    null,
  );
});
