"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`, which is what turns LifeOS into an installable app.
 *
 * Renders nothing. Registration happens only in a production build: during
 * `next dev` the worker would sit in front of Turbopack's HMR and could serve
 * stale chunks — to check installability locally, run `npm run build` and then
 * `npm start`.
 *
 * Signing in is untouched by this: the worker skips `/api/*` and every
 * cross-origin request, so Firebase Auth and Firestore behave exactly as they do
 * without a service worker.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installability is a progressive enhancement — never surface this.
      });
    };

    // After load, so the registration never competes with hydration.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
