import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Raised when the Admin SDK cannot authenticate at all — no credentials, or an
 * unusable service account.
 *
 * Without this distinction a misconfigured deployment looks identical to a bad
 * token: every request fails inside `verifyIdToken`, so the route answers 401
 * and the reader goes hunting for an auth bug. `isAdminConfigError` lets the AI
 * routes answer 503 "not configured" instead.
 */
export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

/** Set on Vercel (and anywhere else) as the service account JSON, one line. */
const SERVICE_ACCOUNT_ENV = "FIREBASE_SERVICE_ACCOUNT";

const rawServiceAccount = process.env[SERVICE_ACCOUNT_ENV]?.trim();

/** Parsed once at load; a malformed value keeps the raw string for reporting. */
function parseServiceAccount(raw: string | undefined): Record<string, string> | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

const serviceAccount = parseServiceAccount(rawServiceAccount);
const serviceAccountIsMalformed = Boolean(rawServiceAccount) && !serviceAccount;

/** True when the failure is missing/broken credentials rather than a bad token. */
export function isAdminConfigError(error: unknown): boolean {
  return error instanceof AdminConfigError;
}

/**
 * Phrases only a credential/bootstrap failure produces. Matching on these (and
 * not on the absence of a `code`, which the credential path also sets) keeps a
 * genuine token or network problem from being reported as a config problem.
 */
const CREDENTIAL_FAILURES = [
  "Could not load the default credentials",
  "Unable to detect a Project Id",
  "Failed to parse private key",
  "Failed to parse service account",
  "Invalid service account",
];

function wrapCredentialFailure(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: unknown } | null)?.code;

  // Every Firebase Auth failure is coded `auth/...` (expired, revoked, bad
  // signature, …) and always means the token, never the deployment.
  if (typeof code === "string" && code.startsWith("auth/")) {
    return error instanceof Error ? error : new Error(message);
  }

  if (CREDENTIAL_FAILURES.some((failure) => message.includes(failure))) {
    return new AdminConfigError(message);
  }

  return error instanceof Error ? error : new Error(message);
}

let app: App | null = null;
let adminAuth: Auth | null = null;

export function getAdminApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }

  if (serviceAccountIsMalformed) {
    throw new AdminConfigError(
      `${SERVICE_ACCOUNT_ENV} is set but is not valid JSON. Paste the service account file's contents as a single-line JSON string.`,
    );
  }

  if (serviceAccount) {
    app = initializeApp({ credential: cert(serviceAccount) });
    return app;
  }

  // Application default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS or a
  // workload identity) are honoured, but on Vercel there are none — so this is
  // the case that silently produced 401s before.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp();
    return app;
  }

  throw new AdminConfigError(
    `Firebase Admin is not configured. Set ${SERVICE_ACCOUNT_ENV} (the service account JSON on one line) or GOOGLE_APPLICATION_CREDENTIALS.`,
  );
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

/**
 * Verifies a Firebase ID token and calls out credential failures as such, so
 * routes can tell "you are not signed in" from "this deployment is not set up".
 */
export async function verifyIdToken(idToken: string) {
  try {
    return await getAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    throw wrapCredentialFailure(error);
  }
}
