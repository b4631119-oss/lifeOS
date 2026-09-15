/**
 * What went wrong during a Firebase sign-in, as a key under `auth.errors.*`.
 *
 * Firebase hands back codes like `auth/unauthorized-domain` and an English
 * message, which is what used to be printed verbatim under the Google button:
 * correct, but untranslated and useless unless you already know that
 * `auth/unauthorized-domain` means "add this host in the Firebase console".
 */
export type AuthErrorKey =
  | "unauthorizedDomain"
  | "popupBlocked"
  | "popupCancelled"
  | "network"
  | "notEnabled"
  | "generic";

/** The `auth/...` code of a Firebase error, or `null` for anything else. */
export function firebaseAuthCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

const KEY_BY_CODE: Record<string, AuthErrorKey> = {
  // The host isn't in Authentication -> Settings -> Authorized domains.
  "auth/unauthorized-domain": "unauthorizedDomain",
  "auth/popup-blocked": "popupBlocked",
  "auth/popup-closed-by-user": "popupCancelled",
  "auth/cancelled-popup-request": "popupCancelled",
  "auth/network-request-failed": "network",
  "auth/operation-not-allowed": "notEnabled",
  "auth/configuration-not-found": "notEnabled",
};

/** Unknown codes fall back to the generic message rather than leaking English. */
export function authErrorKey(error: unknown): AuthErrorKey {
  const code = firebaseAuthCode(error);
  return (code && KEY_BY_CODE[code]) || "generic";
}

/**
 * The host that has to be allow-listed, for the `unauthorizedDomain` message.
 * Firebase rejects the *current* origin, so that is the one to name.
 */
export function currentHost(): string {
  return typeof window === "undefined" ? "" : window.location.host;
}
