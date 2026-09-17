"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  DRAWER_TOGGLE_ID,
  NAV_GROUPS,
  isDrawerHidden,
  isNavItemActive,
  type NavPath,
} from "@/lib/sidebar";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useSidebar } from "../context/SidebarContext";
import {
  CalenderIcon,
  CheckCircleIcon,
  DocsIcon,
  GridIcon,
  PieChartIcon,
  ShootingStarIcon,
  TimeIcon,
  UserCircleIcon,
} from "../icons/index";

/**
 * One icon per destination, keyed by the route.
 *
 * `Record<NavPath, …>` on purpose: the paths come from `lib/sidebar`, so adding
 * a destination there without an icon here is a type error rather than a blank
 * row in the navigation.
 */
const NAV_ICONS: Record<NavPath, React.ReactNode> = {
  "/today": <GridIcon />,
  "/week": <CalenderIcon />,
  "/schedule": <TimeIcon />,
  "/goals": <ShootingStarIcon />,
  "/analytics": <PieChartIcon />,
  "/habits": <CheckCircleIcon />,
  "/notes": <DocsIcon />,
  "/profile": <UserCircleIcon />,
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobile, isMobileOpen, isHovered, closeMobileSidebar } =
    useSidebar();
  const pathname = usePathname();
  const t = useTranslations();
  const tCommon = useTranslations("common");

  /** True when labels fit — the expanded sidebar, a hover, or the open drawer. */
  const showLabels = isExpanded || isHovered || isMobileOpen;
  const drawerHidden = isDrawerHidden(isMobile, isMobileOpen);

  const navRef = useRef<HTMLDivElement>(null);
  /** Whether the drawer was open on the previous render, for the effect below. */
  const wasOpen = useRef(false);

  /**
   * Focus follows the drawer.
   *
   * Opening it moves focus to the first destination, so a keyboard or
   * screen-reader user lands inside what just appeared instead of behind it;
   * closing it — by the X, the backdrop, Escape or a navigation — hands focus
   * back to the header button that opened it, so the next Tab continues from
   * where the drawer was summoned rather than from the top of the document.
   */
  useEffect(() => {
    if (!isMobile) {
      wasOpen.current = false;
      return;
    }

    if (isMobileOpen && !wasOpen.current) {
      wasOpen.current = true;
      navRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
      return;
    }

    if (!isMobileOpen && wasOpen.current) {
      wasOpen.current = false;
      document.getElementById(DRAWER_TOGGLE_ID)?.focus();
    }
  }, [isMobile, isMobileOpen]);

  return (
    <>
      {/* Close button visible inside the mobile drawer — lg:hidden because on
          desktop the sidebar is always visible and has no close affordance. */}
      {isMobileOpen && (
        <button
          // Closes the drawer itself. It used to clear the hover state
          // instead, which left the drawer open with no way out but the
          // backdrop.
          onClick={closeMobileSidebar}
          // Part of the open drawer's tab cycle even though it is not inside
          // the `aside` — see `DRAWER_SELECTOR`.
          data-drawer=""
          className="fixed end-4 top-4 z-[51] flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-md lg:hidden dark:bg-gray-900 dark:text-gray-400"
          aria-label={tCommon("close")}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      <aside
        className={cn(
          // On a phone the drawer must leave the page visible behind it, so
          // its width is capped against the viewport rather than fixed.
          "fixed top-0 left-0 z-50 flex h-full max-w-[86vw] flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out sm:px-5 lg:mt-0",
          "dark:border-gray-800 dark:bg-gray-900",
          isExpanded || isMobileOpen
            ? "w-72.5"
            : isHovered
              ? "w-72.5"
              : "w-22.5",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
        aria-hidden={drawerHidden || undefined}
        inert={drawerHidden || undefined}
        data-drawer=""
      >
        <div
          className={cn(
            "flex py-5 lg:py-8",
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start",
          )}
        >
          <Link href="/today">
            {showLabels ? (
              <>
                <Image
                  className="dark:hidden"
                  src="/images/logo/logo.svg"
                  alt={tCommon("logoAlt")}
                  width={150}
                  height={40}
                  priority
                  style={{ width: "auto", height: "auto" }}
                />
                <Image
                  className="hidden dark:block"
                  src="/images/logo/logo-dark.svg"
                  alt={tCommon("logoAlt")}
                  width={150}
                  height={40}
                  priority
                  style={{ width: "auto", height: "auto" }}
                />
              </>
            ) : (
              <Image
                src="/images/logo/logo-icon.svg"
                alt={tCommon("logoAlt")}
                width={32}
                height={32}
                priority
                style={{ width: "auto", height: "auto" }}
              />
            )}
          </Link>
        </div>
        {/* The drawer's destinations, and what focus enters on open. */}
        <div
          ref={navRef}
          className="no-scrollbar flex flex-col overflow-y-auto pb-4 duration-300 ease-linear"
        >
          {NAV_GROUPS.map((group) => (
            // One landmark per group, named by its own visible label: screen
            // readers can then jump straight to "Review" instead of walking a
            // flat list of eight links.
            <nav key={group.id} className="mb-6" aria-label={t(group.labelKey)}>
              {showLabels ? (
                <p className="mb-4 flex text-xs leading-5 text-gray-400 uppercase">
                  {t(group.labelKey)}
                </p>
              ) : (
                /* Collapsed to the rail there is no room for a word — a rule
                   separates the groups instead of three dots stacked. */
                <span className="mb-4 block h-px bg-gray-200 dark:bg-white/10" />
              )}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isNavItemActive(item.path, pathname);

                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        // The active item is marked for assistive technology too,
                        // not only by its colour: a screen reader gets "current
                        // page" like it would from a server-rendered menu.
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group menu-item",
                          active ? "menu-item-active" : "menu-item-inactive",
                        )}
                      >
                        <span
                          className={cn(
                            active
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive",
                          )}
                        >
                          {NAV_ICONS[item.path]}
                        </span>
                        {showLabels && <span>{t(item.titleKey)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
