"use client";

import { subscribeToAuthState } from "@/lib/authActions";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { ensureUserProfile, setPreferredName as setPreferredNameDoc } from "@/lib/firestore";
import { googleIdentityFields } from "@/lib/profile";
import type { UserProfile } from "@/types/lifeos";
import type { User } from "firebase/auth";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Who is signed in, and the part of the account LifeOS owns.
 *
 * The context exposes the Firebase `User`, and the *stored* profile alongside
 * it. Both are needed because they answer different questions: `user` is the
 * Google identity (email, Google's name and photo), while `profile` is the
 * `users/{uid}` document, whose `preferredName` is the one field the user can
 * change inside LifeOS. Holding it here rather than in the profile page means the
 * header and the profile page can never disagree about what the user is called —
 * one read, one source of truth — and the identity UI derives what to show
 * through `@/lib/identity`.
 *
 * Every auth *action* still lives in `@/lib/authActions` so that `firebase/auth`
 * is never part of a public page's bundle.
 */
type AuthContextType = {
  /** The signed-in Firebase user, or `null` when signed out. */
  user: User | null;
  /** True until the initial auth state has been resolved. */
  loading: boolean;
  /**
   * The stored `users/{uid}` document, or `null` while it is unknown (signed
   * out, or the sign-in sync could not run). Callers fall back to the Google
   * identity in that case rather than showing nothing.
   */
  profile: UserProfile | null;
  /**
   * Saves the name the user chose inside LifeOS. Pass `null` to clear it and go
   * back to the Google name. Rejects on failure so the form can report it.
   */
  savePreferredName: (name: string | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // When Firebase isn't configured there is nothing to wait for.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    // The client SDK must not run before the env vars are available (e.g. during build).
    if (!isFirebaseConfigured) {
      return;
    }

    // The subscription resolves a tick late (the SDK is imported on demand), so
    // an unmount before then has to be able to cancel it.
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void subscribeToAuthState(async (firebaseUser) => {
      let nextProfile: UserProfile | null = null;

      if (firebaseUser) {
        // Keep users/{uid} in sync on every sign-in, and take the stored profile
        // from the same round trip: `ensureUserProfile` already reads the
        // document to decide about `createdAt`, so this costs no extra read.
        try {
          nextProfile = await ensureUserProfile(
            firebaseUser.uid,
            googleIdentityFields(firebaseUser),
          );
        } catch {
          // A failed profile write (e.g. offline) must not block sign-in: the UI
          // then simply shows the Google identity, exactly as it did before the
          // local name existed.
        }
      }

      if (cancelled) return;
      setUser(firebaseUser);
      setProfile(nextProfile);
      setLoading(false);
    }).then((stop) => {
      if (cancelled) {
        stop();
        return;
      }
      unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const savePreferredName = useCallback(
    async (name: string | null) => {
      const uid = user?.uid;
      if (!uid) throw new Error("Not signed in.");

      await setPreferredNameDoc(uid, name);

      // Mirrored locally with the same normalisation the write applied, so the
      // header updates immediately and matches what a reload would show.
      const preferredName =
        typeof name === "string" && name.trim() !== "" ? name.trim() : null;
      setProfile((previous) =>
        previous ? { ...previous, preferredName } : previous,
      );
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, profile, savePreferredName }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
