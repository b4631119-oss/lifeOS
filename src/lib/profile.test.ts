import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PREFERRED_NAME_MAX_LENGTH,
  googleIdentityFields,
  isPreferredNameValid,
  normalizePreferredName,
} from "./profile.ts";

/* ---------------------------- the sync cannot overwrite ---------------------- */

test("the sign-in sync payload carries the three Google fields and nothing else", () => {
  const fields = googleIdentityFields({
    displayName: "Astrid Lind",
    email: "astrid@example.com",
    photoURL: "https://lh3.googleusercontent.com/a/astrid",
  });

  // The invariant, pinned: `preferredName` is LifeOS's own field, so it must be
  // impossible for the sync to carry it. If someone ever adds it here, this test
  // is what fails — a login would otherwise silently undo the user's own name.
  assert.deepEqual(Object.keys(fields).sort(), [
    "displayName",
    "email",
    "photoURL",
  ]);
});

test("the mirror passes Google's values through, including absences", () => {
  assert.deepEqual(
    googleIdentityFields({
      displayName: "Astrid Lind",
      email: "astrid@example.com",
      photoURL: "https://example.com/a.png",
    }),
    {
      displayName: "Astrid Lind",
      email: "astrid@example.com",
      photoURL: "https://example.com/a.png",
    },
  );

  // A Google profile with no name is mirrored as having no name — never as an
  // empty string, which would look like a name that was chosen and then blanked.
  assert.deepEqual(googleIdentityFields({ email: "astrid@example.com" }), {
    displayName: null,
    email: "astrid@example.com",
    photoURL: null,
  });

  assert.deepEqual(googleIdentityFields(null), {
    displayName: null,
    email: null,
    photoURL: null,
  });
});

/* ------------------------------- the local name ------------------------------- */

test("a preferred name is trimmed, and blank means no local choice", () => {
  assert.equal(normalizePreferredName("  Astrid  "), "Astrid");
  assert.equal(normalizePreferredName("Astrid"), "Astrid");

  // Reset, and the shapes a reset can arrive in.
  assert.equal(normalizePreferredName(null), null);
  assert.equal(normalizePreferredName(undefined), null);
  assert.equal(normalizePreferredName(""), null);
  assert.equal(normalizePreferredName("   "), null);
  assert.equal(normalizePreferredName("\n\t"), null);
});

test("a name is only saveable when it is a real, bounded string", () => {
  assert.equal(isPreferredNameValid("Astrid"), true);
  assert.equal(isPreferredNameValid("  Astrid  "), true);
  assert.equal(isPreferredNameValid("🧭 Compass"), true);

  assert.equal(isPreferredNameValid(""), false);
  assert.equal(isPreferredNameValid("   "), false);
  assert.equal(isPreferredNameValid("x".repeat(PREFERRED_NAME_MAX_LENGTH)), true);
  assert.equal(
    isPreferredNameValid("x".repeat(PREFERRED_NAME_MAX_LENGTH + 1)),
    false,
  );
});
