/**
 * Touch targets.
 *
 * The app's own rule is that anything a finger has to hit is at least 44px
 * (WCAG 2.5.8's minimum, and the same number `.app-icon-button` and
 * `.menu-item` are built from). A *text* action is the case that kept slipping
 * below it: the quiet "add with details" beside the capture field was a 30px
 * line of text, which is right for the type and wrong for a thumb.
 *
 * The rule lives here rather than only in the component's class list so a test
 * can hold it: the class string below is what the component uses, and
 * `meetsTouchTarget` says whether a given set of utilities actually clears 44px.
 */

/** One step of Tailwind's default spacing scale: `11` → 2.75rem → 44px. */
const SPACING_STEP_PX = 4;

/** The smallest comfortable hit area, in both axes, for a tappable control. */
export const MIN_TOUCH_TARGET_PX = 44;

/**
 * A text-only secondary action with a real hit area.
 *
 * `inline-flex` so the padding is a box rather than a line of text;
 * `min-h-11` for the 44px itself; `items-center` to keep the compact label
 * centred in it. Deliberately no fill or border: the label stays quiet, so the
 * primary action next to it is still the one that looks like the main one.
 */
export const TEXT_ACTION_HIT_AREA = "inline-flex min-h-11 items-center";

/**
 * The height a class list guarantees, in px, or `null` when it states none.
 *
 * Only utilities that pin a height are read — `min-h-11`, `h-11`,
 * `min-h-[44px]` — and the tallest of them wins, because `h-*` and `min-h-*` can
 * both be present. Everything else a class list carries (colours, padding, type)
 * says nothing about the target's height and is ignored, as is a height given in
 * a unit that is not px or rem (`h-full`, `h-auto`, `h-screen`).
 */
export function declaredHeightPx(classes: string): number | null {
  let height: number | null = null;

  for (const token of classes.split(/\s+/)) {
    const value = /^(?:min-)?h-(.+)$/.exec(token)?.[1];
    if (value === undefined) continue;

    const px = stepPx(value);
    if (px === null) continue;

    height = height === null ? px : Math.max(height, px);
  }

  return height;
}

/** A Tailwind spacing step (`11`) or an arbitrary value (`[44px]`), as px. */
function stepPx(value: string): number | null {
  const arbitrary = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(value);
  if (arbitrary) {
    const amount = Number(arbitrary[1]);
    return arbitrary[2] === "px" ? amount : amount * 16;
  }

  if (!/^\d+$/.test(value)) return null;

  return Number(value) * SPACING_STEP_PX;
}

/** Whether a class list guarantees the minimum comfortable touch height. */
export function meetsTouchTarget(classes: string): boolean {
  return (declaredHeightPx(classes) ?? 0) >= MIN_TOUCH_TARGET_PX;
}
