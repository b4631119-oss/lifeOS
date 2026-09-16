import assert from "node:assert/strict";
import { test } from "node:test";
import { isDrawerHidden } from "./sidebar.ts";

test("desktop keeps the sidebar interactive whether or not the drawer state is set", () => {
  assert.equal(isDrawerHidden(false, false), false);
  assert.equal(isDrawerHidden(false, true), false);
});

test("the mobile drawer is hidden only while it is closed", () => {
  assert.equal(isDrawerHidden(true, false), true);
  assert.equal(isDrawerHidden(true, true), false);
});
