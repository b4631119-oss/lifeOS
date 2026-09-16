import assert from "node:assert/strict";
import { test } from "node:test";
import { isDrawerHidden, nextDrawerPath } from "./sidebar.ts";

test("desktop keeps the sidebar interactive whether or not the drawer state is set", () => {
  assert.equal(isDrawerHidden(false, false), false);
  assert.equal(isDrawerHidden(false, true), false);
});

test("the mobile drawer is hidden only while it is closed", () => {
  assert.equal(isDrawerHidden(true, false), true);
  assert.equal(isDrawerHidden(true, true), false);
});

test("closing the drawer clears the remembered route", () => {
  assert.equal(nextDrawerPath("close", "/today", "/today"), null);
  assert.equal(nextDrawerPath("close", "/today", "/habits"), null);
  assert.equal(nextDrawerPath("close", "/today", null), null);
});

test("toggling opens the drawer on the current route and closes it again", () => {
  const opened = nextDrawerPath("toggle", "/today", null);
  assert.equal(opened, "/today");

  assert.equal(nextDrawerPath("toggle", "/today", opened), null);
});

test("a toggle on a different route opens the drawer rather than closing it", () => {
  // Regression: the drawer is remembered by path, so after navigating the same
  // "toggle" must open it again instead of being read as a second close.
  assert.equal(nextDrawerPath("toggle", "/habits", "/today"), "/habits");
});

test("close works from every state the drawer can be in", () => {
  // Regression: the close button used to perform an unrelated state update, so
  // an open drawer stayed open. Closing must not depend on the drawer being on
  // the current route.
  for (const state of [null, "/today", "/habits", "/ru/today"]) {
    assert.equal(nextDrawerPath("close", "/today", state), null);
  }
});
