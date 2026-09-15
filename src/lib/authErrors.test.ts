import assert from "node:assert/strict";
import { test } from "node:test";

import { authErrorKey, firebaseAuthCode } from "./authErrors.ts";

test("the auth code is read off the error object", () => {
  assert.equal(
    firebaseAuthCode({ code: "auth/unauthorized-domain" }),
    "auth/unauthorized-domain",
  );
  assert.equal(firebaseAuthCode(new Error("boom")), null);
  assert.equal(firebaseAuthCode(null), null);
  assert.equal(firebaseAuthCode(undefined), null);
  assert.equal(firebaseAuthCode({ code: 42 }), null);
});

test("the domain failure is reported as a domain problem, not a generic one", () => {
  // The only failure the user can fix from the app's message alone.
  assert.equal(
    authErrorKey({ code: "auth/unauthorized-domain" }),
    "unauthorizedDomain",
  );
});

test("popup and network failures each keep their own message", () => {
  assert.equal(authErrorKey({ code: "auth/popup-blocked" }), "popupBlocked");
  assert.equal(
    authErrorKey({ code: "auth/popup-closed-by-user" }),
    "popupCancelled",
  );
  assert.equal(
    authErrorKey({ code: "auth/cancelled-popup-request" }),
    "popupCancelled",
  );
  assert.equal(authErrorKey({ code: "auth/network-request-failed" }), "network");
  assert.equal(authErrorKey({ code: "auth/operation-not-allowed" }), "notEnabled");
  assert.equal(
    authErrorKey({ code: "auth/configuration-not-found" }),
    "notEnabled",
  );
});

test("an unknown or missing code falls back to the generic message", () => {
  assert.equal(authErrorKey({ code: "auth/something-new" }), "generic");
  // The English text is deliberately not parsed — only the code is trusted.
  assert.equal(
    authErrorKey(new Error("Firebase: Error (auth/unauthorized-domain)")),
    "generic",
  );
  assert.equal(authErrorKey(undefined), "generic");
});
