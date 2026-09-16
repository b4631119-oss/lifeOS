import {
  isFirebaseConfigured,
  NOT_CONFIGURED_MESSAGE,
  firebaseConfig,
} from "./firebaseConfig";

import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Firestore, getFirestore } from "firebase/firestore";

/**
 * The synchronous Firestore facade used by the data layer.
 *
 * `src/lib/firestore.ts` and the hooks cannot work without the SDK anyway, so
 * this module imports it statically and hands back a singleton — while anything
 * that must stay Firebase-free (the public landing page, the sign-in form)
 * loads the SDK through `./authActions` instead, which imports it on demand.
 *
 * The config itself is not repeated here: `./firebaseConfig` is the one place
 * the env vars are mapped, so both paths initialize the same app (guarded by
 * `getApps()`).
 */

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

/** Returns the singleton Firebase app, initializing it on first use. */
function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE);
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/** Returns the singleton Firestore instance. */
export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
