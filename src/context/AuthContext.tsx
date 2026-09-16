"use client";

import { subscribeToAuthState } from "@/lib/authActions";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { ensureUserProfile } from "@/lib/firestore";
import type { User } from "firebase/auth";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * Who is signed in.
 *
 * The context exposes the Firebase `User` and nothing more: the identity the UI
 * shows (name, email, avatar) is derived from that object through
 * `@/lib/identity`, and every auth *action* lives in `@/lib/authActions` so
 * that `firebase/auth` is never part of a public page's bundle.
 */
type AuthContextType = {
  /** The signed-in Firebase user, or `null` when signed out. */
  user: User | null;
  /** True until the initial auth state has been resolved. */
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
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
      if (firebaseUser) {
        // Keep users/{uid} in sync on every sign-in.
        try {
          await ensureUserProfile(firebaseUser.uid, {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
        } catch {
          // A failed profile write (e.g. offline) must not block sign-in.
        }
      }

      if (cancelled) return;
      setUser(firebaseUser);
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

  return (
    <AuthContext.Provider value={{ user, loading }}>
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
