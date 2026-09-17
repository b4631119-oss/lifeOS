import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRAWER_SELECTOR,
  DRAWER_TOGGLE_ID,
  NAV_GROUPS,
  NAV_PATHS,
  isDrawerHidden,
  isDrawerTrapped,
  isNavItemActive,
  nextDrawerPath,
} from "./sidebar.ts";

test("desktop keeps the sidebar interactive whether or not the drawer state is set", () => {
  assert.equal(isDrawerHidden(false, false), false);
  assert.equal(isDrawerHidden(false, true), false);
});

test("the mobile drawer is hidden only while it is closed", () => {
  assert.equal(isDrawerHidden(true, false), true);
  assert.equal(isDrawerHidden(true, true), false);
});

test("the page behind the drawer is trapped only while the drawer is a modal overlay", () => {
  assert.equal(isDrawerTrapped(true, true), true);
  assert.equal(isDrawerTrapped(true, false), false);
  // Desktop: the sidebar sits beside the content, so nothing is ever trapped —
  // even if the drawer's own state were somehow left set.
  assert.equal(isDrawerTrapped(false, true), false);
  assert.equal(isDrawerTrapped(false, false), false);
});

test("the trap finds the drawer by attribute, not by a class that can be renamed", () => {
  assert.match(DRAWER_SELECTOR, /^\[data-[a-z-]+\]$/);
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

const groupedPaths = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => item.path),
);

test("the navigation points at every module exactly once", () => {
  assert.deepEqual([...groupedPaths].sort(), [...NAV_PATHS].sort());
  assert.equal(new Set(groupedPaths).size, groupedPaths.length);
});

test("every group has a label and at least one destination", () => {
  for (const group of NAV_GROUPS) {
    assert.ok(group.labelKey.startsWith("sidebar.groups."));
    assert.ok(group.items.length > 0, `${group.id} is empty`);
  }
});

test("group ids are unique", () => {
  const ids = NAV_GROUPS.map((group) => group.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("planning comes before review, and the account last", () => {
  // The grouping is the answer to "what am I doing right now": arranging work,
  // then looking back at it, then everything that is not work at all.
  assert.deepEqual(
    NAV_GROUPS.map((group) => group.id),
    ["plan", "review", "account"],
  );
});

test("a destination is active on its own route", () => {
  assert.equal(isNavItemActive("/today", "/today"), true);
  assert.equal(isNavItemActive("/today", "/week"), false);
});

test("a nested route keeps its parent lit", () => {
  // `/goals/[goalId]` is still the Goals module, so the nav must not go dark.
  assert.equal(isNavItemActive("/goals", "/goals/g-123"), true);
  assert.equal(isNavItemActive("/today", "/today/states"), true);
});

test("a path that merely shares a prefix is not active", () => {
  assert.equal(isNavItemActive("/today", "/todaylist"), false);
  assert.equal(isNavItemActive("/notes", "/notes-archive"), false);
});

test("nothing is active on a route outside the navigation", () => {
  for (const path of NAV_PATHS) {
    assert.equal(isNavItemActive(path, "/"), false);
  }
});

test("the drawer toggle has an id the sidebar can hand focus back to", () => {
  assert.ok(DRAWER_TOGGLE_ID.length > 0);
});
