/**
 * Turning a signed-in Firebase user into the strings the UI needs.
 *
 * The profile is written by Google, so any of the three fields can be absent —
 * an account created with a Google profile that has no name set, or an app
 * where the email scope was not granted. Every screen that shows "who am I"
 * (the header button, the profile page) therefore resolves the identity through
 * here instead of reading `user.displayName` directly, so all of them fall back
 * the same way, and none of them can ever show a value that did not come from
 * the authenticated account.
 *
 * The one value that does *not* come from the Firebase user is the local
 * `preferredName` the user chose inside LifeOS. It is an explicit parameter
 * rather than something read here, so this module stays pure — and every caller
 * that passes it renders the same name the profile page saved.
 *
 * Deliberately free of runtime imports so it can be unit-tested through Node's
 * native test runner, which cannot resolve the project's `@/*` aliases (see
 * `notes.test.ts` / `completionStamp.ts` for the same pattern).
 */

/** The slice of the Firebase `User` this module reads. */
export type IdentityUser =
  | {
      displayName?: string | null;
      email?: string | null;
      photoURL?: string | null;
    }
  | null
  | undefined;

export type Identity = {
  /** Display name, else the email's local part, else `""`. */
  name: string;
  /** Email, else `""`. */
  email: string;
  /** An http(s) avatar URL, else `null` (the caller draws initials instead). */
  photoURL: string | null;
  /** Uppercase first character of the name, else `""`. */
  initial: string;
};

/** The part of an email before the `@`, or `""`. */
export function localPartOf(email: string | null | undefined): string {
  if (typeof email !== "string") return "";

  const at = email.indexOf("@");
  const local = at === -1 ? email : email.slice(0, at);
  return local.trim();
}

/**
 * The best available human name, in the order the product promises:
 *
 * 1. the name the user chose inside LifeOS (`preferredName` on `users/{uid}`);
 * 2. the Google display name;
 * 3. the email's local part, which beats an empty header (`ivan.petrov` > `—`);
 * 4. `""`, so the caller can use a translated fallback.
 *
 * The local name comes first because it is the only one the user set *here*: a
 * Google name is what the account is called, not what the user asked LifeOS to
 * call them.
 */
export function displayNameOf(
  user: IdentityUser,
  preferredName?: string | null,
): string {
  const preferred =
    typeof preferredName === "string" ? preferredName.trim() : "";
  if (preferred) return preferred;

  const displayName =
    typeof user?.displayName === "string" ? user.displayName.trim() : "";
  if (displayName) return displayName;

  return localPartOf(user?.email);
}

export function emailOf(user: IdentityUser): string {
  return typeof user?.email === "string" ? user.email.trim() : "";
}

/**
 * The avatar URL, or `null` when there is nothing safe to render.
 *
 * Only `https://` is accepted: the value is rendered by `next/image` (which is
 * also why `next.config.ts` allow-lists the Google avatar host), and anything
 * else — a `data:`/`javascript:` value from a tampered profile, or a plain
 * `http://` URL — must never reach the DOM. A rejected URL is not an error
 * state: the UI falls back to the initials circle.
 */
export function photoURLOf(user: IdentityUser): string | null {
  const url = typeof user?.photoURL === "string" ? user.photoURL.trim() : "";
  return /^https:\/\//i.test(url) ? url : null;
}

/**
 * The first character of a name, uppercased, for the avatar fallback.
 *
 * Iterates by code point (`Array.from`) rather than by UTF-16 unit so an emoji
 * or a surrogate pair is not cut in half; whitespace-only names yield `""`.
 */
export function initialOf(name: string): string {
  const [first] = Array.from(name.trim());
  return first ? first.toLocaleUpperCase() : "";
}

/** Everything the identity UI needs, in one pass. */
export function resolveIdentity(
  user: IdentityUser,
  preferredName?: string | null,
): Identity {
  const name = displayNameOf(user, preferredName);

  return {
    name,
    email: emailOf(user),
    photoURL: photoURLOf(user),
    initial: initialOf(name),
  };
}
