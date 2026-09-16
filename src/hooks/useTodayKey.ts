"use client";

import { msUntilNextLocalDay, todayKey } from "@/lib/date";
import { useEffect, useState } from "react";

/**
 * Today's date (`YYYY-MM-DD`), kept correct while the page stays open.
 *
 * `todayKey()` read once on mount is only correct until the next midnight: an
 * installed PWA or a tab left open overnight would keep creating tasks, habit
 * logs and notes under yesterday's date, and the user would silently lose the
 * new day's data. Nothing reloads the app by itself, so the day has to be
 * observed here — one timer per day, plus a re-check whenever the tab becomes
 * visible again (background tabs throttle timers, and a sleeping laptop does
 * not run them at all).
 *
 * Returns a plain string, so it can be dropped in wherever `todayKey()` was
 * computed once — and because it is state, changing it re-runs the effect that
 * depends on it, which is what moves the subscriptions to the new day.
 */
export function useTodayKey(): string {
  const [today, setToday] = useState(() => todayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      if (timer !== undefined) clearTimeout(timer);

      const now = new Date();
      const current = todayKey(now);
      // Bailing out on an unchanged value keeps focus/resume events free: React
      // skips the re-render when the state is the same string.
      setToday((previous) => (previous === current ? previous : current));

      // One second past midnight rather than exactly on it, so a timer that
      // fires a hair early can never read the day that is ending.
      timer = setTimeout(sync, msUntilNextLocalDay(now) + 1000);
    };

    sync();

    const onResume = () => {
      if (document.visibilityState === "visible") sync();
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, []);

  return today;
}
