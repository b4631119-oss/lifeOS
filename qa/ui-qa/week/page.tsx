"use client";

/**
 * TEMPORARY QA screen (see `../page.tsx`).
 *
 * The *real* Week view at the document level, so the harness can load it in an
 * `<iframe>` of a given width — an iframe is a real viewport for CSS, so the
 * day-card grid and the week review resolve their breakpoints exactly as they do
 * on a device of that width.
 *
 * It renders signed out (there is no account behind the harness), so the week
 * itself is empty: what this screen proves is the grid, the cards, the empty-day
 * state, the capture and the review's own layout. The cards *with* data are
 * rendered from fixtures in the harness index, where the row components are
 * shown — those have no viewport-dependent classes of their own.
 */
import WeekView from "@/components/week/WeekView";
import Shell from "../Shell";

export default function UiQaWeekPage() {
  return (
    <Shell>
      <WeekView />
    </Shell>
  );
}
