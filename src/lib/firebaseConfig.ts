import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

/**
 * The Firebase client configuration, on its own.
 *
 * This module deliberately imports nothing from the SDK at runtime: only the
 * two `import type`s above, which TypeScript erases. Everything that needs an
 * SDK instance loads it through the async helpers at the bottom, so a chunk
 * that only reads `isFirebaseConfigured` (the landing page deciding whether to
 * offer sign-in at all, say) does not drag ~190 KB of gzip behind it.
 *
 * `src/lib/firebase.ts` keeps the synchronous Firestore facade for the data
 * layer (`src/lib/firestore.ts` and the hooks, which cannot work without the
 * SDK anyway) and reads the same config object from here, so there is exactly
 * one place where the env vars are mapped.
 *
 * Values come from `NEXT_PUBLIC_*` environment variables (see `.env.example`)
 * because the client SDK runs in the browser.
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const NOT_CONFIGURED =
  "Firebase is not configured. Copy .env.example to .env and fill in the NEXT_PUBLIC_FIREBASE_* values.";

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
  if (!isFirebaseConfigured) throw new Error(NOT_CONFIGURED);

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
