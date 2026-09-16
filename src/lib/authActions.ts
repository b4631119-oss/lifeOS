"use client";

import { loadFirebaseAuth } from "./firebaseConfig";
import type { Unsubscribe, User } from "firebase/auth";

/**
 * Every auth action the UI can trigger, each loading the SDK on demand.
 *
 * These live here rather than in `AuthContext` so that `firebase/auth` is not
 * part of any page's initial bundle: the public landing page and `/signin`
 * ship no Firebase code at all, the first click on "Sign in with Google"
 * fetches it (the button warms the import on hover/focus, see
 * `GoogleSignInButton`), and the dashboard loads it during the auth check it
 * was already waiting for.
 *
 * The avatar and name shown in the header and on the profile page come from the
 * `User` this module resolves — the app holds no identity of its own.
 *
 * `import type` at the top is erased at build time, so it does not pull the SDK
 * back into the bundle.
 */

/** Opens the Google popup and resolves with the signed-in user. */
export async function signInWithGoogle(): Promise<User> {
  const [{ GoogleAuthProvider, signInWithPopup }, auth] = await Promise.all([
    import("firebase/auth"),
    loadFirebaseAuth(),
  ]);

  const provider = new GoogleAuthProvider();
  // Always let the user pick which Google account to use, even when only one is
  // signed in on the device.
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

/** Signs the current user out of the browser session. */
export async function signOutUser(): Promise<void> {
  const [{ signOut }, auth] = await Promise.all([
    import("firebase/auth"),
    loadFirebaseAuth(),
  ]);
  await signOut(auth);
}

/**
 * Subscribes to auth-state changes and resolves with the unsubscribe function.
 *
 * Async because the SDK arrives on demand: the caller has to cope with the
 * subscription being set up a tick late (see `AuthProvider`, which keeps a
 * `cancelled` flag for exactly that).
 */
export async function subscribeToAuthState(
  listener: (user: User | null) => void,
): Promise<Unsubscribe> {
  const [{ onAuthStateChanged }, auth] = await Promise.all([
    import("firebase/auth"),
    loadFirebaseAuth(),
  ]);

  return onAuthStateChanged(auth, listener);
}

/** Warms the auth chunk without doing anything with it. */
export function preloadAuthSdk(): void {
  void import("firebase/auth");
}
