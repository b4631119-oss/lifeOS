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

/**
 * Whether the drawer is covering the page, i.e. is a modal navigation overlay.
 *
 * True only on a phone or tablet with the drawer open — the desktop sidebar sits
 * beside the content and traps nothing. While it is true the page behind the
 * drawer is `inert` and Tab is cycled inside the drawer, so a keyboard user
 * cannot wander into content they cannot see.
 */
export function isDrawerTrapped(isMobile: boolean, isMobileOpen: boolean) {
  return isMobile && isMobileOpen;
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

/**
 * Marks the elements that make up the open mobile drawer's tab cycle.
 *
 * Two elements carry it: the `aside` with the destinations, and the drawer's
 * close button. The close button is rendered as the `aside`'s sibling rather
 * than inside it (it is fixed to the viewport corner instead of laid out in the
 * column), so the focus trap finds both by this attribute rather than by
 * holding two refs across two components — one drawer, one cycle, however the
 * DOM happens to nest it.
 */
export const DRAWER_SELECTOR = "[data-drawer]";

/**
 * The id of the header button that opens the drawer.
 *
 * Lives here because two components need to agree on it: the header owns the
 * button, and the sidebar — which is the thing being revealed — is the one that
 * has to hand focus back to it when the drawer closes. A shared constant beats
 * two copies of a string that would silently stop matching.
 */
export const DRAWER_TOGGLE_ID = "app-drawer-toggle";

/** One destination in the sidebar. */
export type NavItem = {
  /** Route path without the locale prefix, e.g. `/today`. */
  path: NavPath;
  /** Message key under the root namespace, the module's own name. */
  titleKey: string;
};

/** A labelled run of destinations. */
export type NavGroup = {
  id: string;
  /** Message key for the group's label. */
  labelKey: string;
  items: NavItem[];
};

/**
 * Every path the sidebar can point at.
 *
 * Declared as a union so the icon table in `AppSidebar` can be typed against it:
 * adding a destination here without giving it an icon then fails `tsc` instead
 * of rendering a blank row.
 */
export const NAV_PATHS = [
  "/today",
  "/week",
  "/schedule",
  "/goals",
  "/analytics",
  "/habits",
  "/notes",
  "/profile",
] as const;

export type NavPath = (typeof NAV_PATHS)[number];

/**
 * The navigation, grouped by what the user is doing.
 *
 * A flat list of eight destinations gave no answer to "where does planning end
 * and reflection begin", which is the distinction the product is built on:
 *
 *  - *Plan* — decide and arrange the work (a day, a week, a day's timeline, and
 *    the goals the work is meant to move).
 *  - *Review* — look back at what happened (what got done, how consistently,
 *    what was written down).
 *  - *Account* — the settings that are not work at all.
 *
 * Labels are message keys, not strings: the same nav renders in both locales,
 * and the wording is owned by the dictionaries like every other label.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "plan",
    labelKey: "sidebar.groups.plan",
    items: [
      { path: "/today", titleKey: "today.title" },
      { path: "/week", titleKey: "week.title" },
      { path: "/schedule", titleKey: "schedule.title" },
      { path: "/goals", titleKey: "goals.title" },
    ],
  },
  {
    id: "review",
    labelKey: "sidebar.groups.review",
    items: [
      { path: "/analytics", titleKey: "analytics.title" },
      { path: "/habits", titleKey: "habits.title" },
      { path: "/notes", titleKey: "notes.title" },
    ],
  },
  {
    id: "account",
    labelKey: "sidebar.groups.account",
    items: [{ path: "/profile", titleKey: "profile.title" }],
  },
];

/**
 * Whether a destination is the one on screen.
 *
 * Exact match, or a nested route below it (`/goals/abc` keeps Goals lit), which
 * is what the URL does too. Compared against the *unprefixed* pathname the
 * router returns, so a locale prefix can never break the highlight.
 */
export function isNavItemActive(path: NavPath, pathname: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}
