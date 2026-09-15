"use client";

import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/firestore";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type AuthContextType = {
  /** The signed-in Firebase user, or `null` when signed out. */
  user: User | null;
  /** True until the initial auth state has been resolved. */
  loading: boolean;
  /** Opens the Google popup and signs the user in. */
  loginWithGoogle: () => Promise<User>;
  /** Signs the current user out. */
  logout: () => Promise<void>;
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

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    return credential.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
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
