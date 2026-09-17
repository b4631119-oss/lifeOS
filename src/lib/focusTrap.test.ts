import assert from "node:assert/strict";
import { test } from "node:test";

import { FOCUSABLE_SELECTOR, focusableWithin, trapIndex } from "./focusTrap.ts";

test("Tab in the middle of the drawer is left to the browser", () => {
  assert.equal(trapIndex(5, 1, false), null);
  assert.equal(trapIndex(5, 3, true), null);
});

test("Tab from the last element wraps to the first", () => {
  // Without this the focus leaves the drawer for the browser chrome, which is
  // the bug: the page behind is inert, but the end of the list is not the end.
  assert.equal(trapIndex(5, 4, false), 0);
});

test("Shift+Tab from the first element wraps to the last", () => {
  assert.equal(trapIndex(5, 0, true), 4);
});

test("focus that is not inside the drawer is pulled to the nearer end", () => {
  assert.equal(trapIndex(5, -1, false), 0);
  assert.equal(trapIndex(5, -1, true), 4);
});

test("a single-element drawer wraps onto itself", () => {
  assert.equal(trapIndex(1, 0, false), 0);
  assert.equal(trapIndex(1, 0, true), 0);
});

test("a drawer with nothing focusable takes no focus", () => {
  assert.equal(trapIndex(0, -1, false), null);
  assert.equal(trapIndex(0, -1, true), null);
});

test("a missing container holds nothing to focus", () => {
  assert.deepEqual(focusableWithin(null), []);
});

test("the selector covers links and controls but not a programmatic tabindex", () => {
  assert.match(FOCUSABLE_SELECTOR, /a\[href\]/);
  assert.match(FOCUSABLE_SELECTOR, /button:not\(\[disabled\]\)/);
  assert.match(FOCUSABLE_SELECTOR, /\[tabindex\]:not\(\[tabindex='-1'\]\)/);
});
