import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

/**
 * The Firebase client configuration, on its own.
 *
 * This module deliberately imports nothing from the SDK at runtime: only the
 * two `import type`s above, which TypeScript erases. Everything that needs an
 * SDK instance loads it through the async helpers at the bottom, so a chunk
 * that only reads `isFirebaseConfigured` does not drag the SDK behind it.
 *
 * This is the *only* place the `NEXT_PUBLIC_FIREBASE_*` variables are mapped to
 * config fields: `src/lib/firebase.ts` (the Firestore facade used by the data
 * layer) imports the object from here rather than repeating the mapping.
 *
 * Values come from environment variables (see `.env.example`) because the
 * client SDK runs in the browser.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the minimum required Firebase env vars are present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

/** Message shown when the app is used without a configured Firebase project. */
export const NOT_CONFIGURED_MESSAGE =
  "Firebase is not configured. Copy .env.example to .env and fill in the NEXT_PUBLIC_FIREBASE_* values.";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * The singleton app, initialized on first use.
 *
 * `getApps()`/`getApp()` are consulted through the dynamic import so this stays
 * true even when `src/lib/firebase.ts` has already initialized the app for the
 * data layer — both paths resolve to the same module instance, hence the same
 * app.
 */
export async function loadFirebaseApp(): Promise<FirebaseApp> {
  if (app) return app;
  if (!isFirebaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE);

  const { getApp, getApps, initializeApp } = await import("firebase/app");
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

/** The singleton Auth instance, loaded on demand. */
export async function loadFirebaseAuth(): Promise<Auth> {
  if (auth) return auth;

  const { getAuth } = await import("firebase/auth");
  auth = getAuth(await loadFirebaseApp());
  return auth;
}
