import type { NewUserProfile } from "@/types/lifeos";

/**
 * The rules that keep the two halves of a profile apart.
 *
 * A LifeOS account is a Google account, but not every field belongs to Google.
 * Email and the Google name/photo are the identity's; the name the user picks
 * *inside LifeOS* is LifeOS's own, and the whole point of this module is that the
 * sign-in sync can never touch it.
 *
 * That invariant is enforced structurally rather than by care: the sync accepts
 * `NewUserProfile`, a `Pick` of exactly the three Google fields, so a caller has
 * no `preferredName` to pass even by accident. `googleIdentityFields` is the only
 * thing that builds that payload, and `profile.test.ts` fails if it ever grows a
 * fourth field.
 *
 * Deliberately free of runtime imports — only types — so the unit tests can load
 * it through Node's native test runner, which cannot resolve the project's `@/*`
 * aliases (the same pattern as `lib/notes.ts` and `lib/identity.ts`).
 */

/** The slice of a Firebase `User` this module reads. */
export type GoogleUser = {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
} | null | undefined;

/**
 * The Google-owned fields, in the only shape the sync may write.
 *
 * Values are passed through as Firebase reports them (including `null`), because
 * this is a *mirror* of the identity: nothing here is derived, and an account
 * whose Google profile has no name must be mirrored as having none rather than
 * as having an empty string.
 */
export function googleIdentityFields(user: GoogleUser): NewUserProfile {
  return {
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
    photoURL: user?.photoURL ?? null,
  };
}

/**
 * The local display name, or `null` for "no local choice".
 *
 * Trimming here means the rest of the app never has to: a name of `"  "` is not
 * a name, and saving one would shadow the Google name with an invisible string.
 * `null` (or an empty string, or absent) therefore reads as "use the Google
 * name", which is also what the reset action writes.
 */
export function normalizePreferredName(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The longest local name LifeOS stores, so a paste cannot become the layout. */
export const PREFERRED_NAME_MAX_LENGTH = 60;

/** True when the name is something the user can actually save. */
export function isPreferredNameValid(value: string): boolean {
  const normalized = normalizePreferredName(value);
  return normalized !== null && normalized.length <= PREFERRED_NAME_MAX_LENGTH;
}
