/**
 * Keeping keyboard focus inside the open drawer.
 *
 * The drawer is an overlay: while it is open the page behind it is `inert`, so
 * the only elements a keyboard user can reach are the ones the drawer holds.
 * What the browser does *not* do is wrap Tab back to the first of them — from
 * the last destination it moves on out of the document and into the browser
 * chrome — so the two ends are wrapped by hand.
 *
 * The decision is kept here as plain values in, plain values out, so the cycling
 * rule can be reasoned about (and tested) without a DOM, the same way
 * `lib/sidebar.ts` holds the drawer's own state rules.
 */

/**
 * What counts as focusable, as `querySelectorAll` sees it.
 *
 * `[tabindex="-1"]` is out on purpose: a container that is focusable
 * programmatically is not part of the Tab order the trap has to cycle.
 */
export const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The focusable elements inside a container, in document order. */
export function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Where Tab / Shift+Tab should move inside a trap of `count` elements.
 *
 * `null` means "leave it to the browser" — the ordinary case of moving between
 * two elements in the middle of the list. Only the ends need the trap's
 * attention: forward from the last element wraps to the first, backward from the
 * first wraps to the last. A focus that is not inside the trap at all (`current`
 * of -1: the element it was on was removed, or the opening focus never landed)
 * is pulled to the nearer end, so the next Tab cannot escape either.
 */
export function trapIndex(
  count: number,
  current: number,
  backwards: boolean,
): number | null {
  if (count <= 0) return null;

  if (current < 0) return backwards ? count - 1 : 0;
  if (backwards && current === 0) return count - 1;
  if (!backwards && current === count - 1) return 0;

  return null;
}
