import assert from "node:assert/strict";
import { test } from "node:test";

import {
  displayNameOf,
  emailOf,
  initialOf,
  localPartOf,
  photoURLOf,
  resolveIdentity,
} from "./identity.ts";

test("the display name is preferred and trimmed", () => {
  assert.equal(
    displayNameOf({ displayName: "  Astrid Lind  " }),
    "Astrid Lind",
  );
});

test("a missing or blank display name falls back to the email local part", () => {
  assert.equal(
    displayNameOf({ displayName: null, email: "astrid@example.com" }),
    "astrid",
  );
  assert.equal(
    displayNameOf({ displayName: "   ", email: "astrid@example.com" }),
    "astrid",
  );
  assert.equal(displayNameOf({ email: "a.b.c@example.com" }), "a.b.c");
});

test("no display name and no email yields an empty name, never a placeholder", () => {
  assert.equal(displayNameOf(null), "");
  assert.equal(displayNameOf(undefined), "");
  assert.equal(displayNameOf({}), "");
  assert.equal(displayNameOf({ displayName: "  ", email: "" }), "");
});

test("the email local part tolerates odd values", () => {
  assert.equal(localPartOf("ivan@example.com"), "ivan");
  assert.equal(localPartOf("ivan"), "ivan");
  assert.equal(localPartOf("@example.com"), "");
  assert.equal(localPartOf(""), "");
  assert.equal(localPartOf(null), "");
  assert.equal(localPartOf(undefined), "");
});

test("only https avatar URLs survive", () => {
  assert.equal(
    photoURLOf({ photoURL: "https://lh3.googleusercontent.com/a/abc" }),
    "https://lh3.googleusercontent.com/a/abc",
  );
  assert.equal(photoURLOf({ photoURL: "http://example.com/a.png" }), null);
  assert.equal(photoURLOf({ photoURL: "javascript:alert(1)" }), null);
  assert.equal(photoURLOf({ photoURL: "data:image/png;base64,AAAA" }), null);
  assert.equal(photoURLOf({ photoURL: "   " }), null);
  assert.equal(photoURLOf({ photoURL: null }), null);
  assert.equal(photoURLOf(null), null);
});

test("the initial is the first code point, uppercased", () => {
  assert.equal(initialOf("astrid"), "A");
  assert.equal(initialOf("  émile "), "É");
  assert.equal(initialOf("🧭 compass"), "🧭");
  assert.equal(initialOf(""), "");
  assert.equal(initialOf("   "), "");
});

test("resolveIdentity never throws on a partial or absent user", () => {
  assert.deepEqual(resolveIdentity(null), {
    name: "",
    email: "",
    photoURL: null,
    initial: "",
  });

  assert.deepEqual(
    resolveIdentity({
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      photoURL: "https://lh3.googleusercontent.com/a/ada",
    }),
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      photoURL: "https://lh3.googleusercontent.com/a/ada",
      initial: "A",
    },
  );

  // The realistic half-empty case: an email but no name, and no avatar.
  assert.deepEqual(resolveIdentity({ email: "ada@example.com" }), {
    name: "ada",
    email: "ada@example.com",
    photoURL: null,
    initial: "A",
  });
});

/* ------------------------------- the local name ------------------------------ */

test("the name chosen in LifeOS wins over the Google name", () => {
  const google = {
    displayName: "Astrid Lind",
    email: "astrid@example.com",
  };

  assert.equal(displayNameOf(google, "Астрид"), "Астрид");
  assert.equal(resolveIdentity(google, "Астрид").name, "Астрид");
  assert.equal(resolveIdentity(google, "Астрид").initial, "А");
  // Only the name is affected: the email and the photo stay the identity's.
  assert.equal(resolveIdentity(google, "Астрид").email, "astrid@example.com");
});

test("clearing the local name falls back to Google, then to the email", () => {
  const google = { displayName: "Astrid Lind", email: "a@example.com" };

  // `null`, an empty string and whitespace all mean "no local choice" — which is
  // what the reset action writes, so a reset must restore the Google name.
  assert.equal(displayNameOf(google, null), "Astrid Lind");
  assert.equal(displayNameOf(google, ""), "Astrid Lind");
  assert.equal(displayNameOf(google, "   "), "Astrid Lind");

  assert.equal(displayNameOf({ email: "a@example.com" }, null), "a");
  assert.equal(displayNameOf(null, null), "");
});

test("a local name is trimmed before it is shown", () => {
  assert.equal(displayNameOf(null, "  Астрид  "), "Астрид");
  assert.equal(resolveIdentity(null, "  Астрид  ").initial, "А");
});

test("the email is passed through for display and never invented", () => {
  assert.equal(emailOf({ email: " ada@example.com " }), "ada@example.com");
  assert.equal(emailOf({}), "");
  assert.equal(emailOf(null), "");
});
