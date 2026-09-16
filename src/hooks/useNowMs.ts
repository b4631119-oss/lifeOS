"use client";

import { useSyncExternalStore } from "react";

/** How often the clock advances. */
const TICK_MS = 60_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  if (timer === null) {
    timer = setInterval(emit, TICK_MS);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * The snapshot is the current minute as a timestamp, so it stays referentially
 * stable between ticks — returning a fresh `Date` here would loop forever.
 */
function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

/**
 * Timestamp of the current minute, re-emitted once a minute.
 *
 * Uses `useSyncExternalStore` rather than state-in-an-effect: the server
 * snapshot is `null`, so the caller can skip rendering the "now" line during
 * hydration (its position cannot match between server and client) and the
 * subscription takes over right after. It also keeps the effect body free of a
 * synchronous `setState`.
 */
export function useNowMs(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Minutes since local midnight for a timestamp from {@link useNowMs}. */
export function minutesOfDay(timestampMs: number): number {
  const date = new Date(timestampMs);
  return date.getHours() * 60 + date.getMinutes();
}
