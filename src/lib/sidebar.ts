/**
 * Pure rules for the sidebar / mobile drawer.
 *
 * Kept out of the React context so they can be reasoned about (and tested) on
 * their own — the same pattern as `lib/habits.ts`.
 */

/**
 * Whether the sidebar has to be taken out of the tab order and hidden from
 * assistive technology.
 *
 * Only the mobile drawer qualifies, and only while it is closed. On desktop the
 * sidebar is always on screen: keying this off `!isMobileOpen` alone made the
 * whole nav `inert` there, so every link inside it silently stopped working.
 */
export function isDrawerHidden(isMobile: boolean, isMobileOpen: boolean) {
  return isMobile && !isMobileOpen;
}

/** What the drawer can be asked to do. */
export type DrawerAction = "toggle" | "close";

/**
 * The drawer's open-at path after an action.
 *
 * The drawer is remembered as *the route it was opened on* rather than as a
 * boolean, so navigating closes it without an effect (a new `pathname` is no
 * longer the remembered one). That storage choice is why "close" has to be
 * modelled explicitly: the close button, the backdrop and Escape all have to
 * clear the remembered route, and the previous implementation of the close
 * button silently performed a different update (it cleared the hover state), so
 * tapping X left the drawer open.
 */
export function nextDrawerPath(
  action: DrawerAction,
  pathname: string,
  openAtPath: string | null,
): string | null {
  if (action === "close") return null;

  return openAtPath === pathname ? null : pathname;
}
