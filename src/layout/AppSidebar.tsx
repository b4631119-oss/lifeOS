"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback } from "react";
import { useSidebar } from "../context/SidebarContext";
import {
  CheckCircleIcon,
  DocsIcon,
  GridIcon,
  HorizontaLDots,
  PieChartIcon,
  ShootingStarIcon,
  TimeIcon,
  UserCircleIcon,
} from "../icons/index";

type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  target?: string;
};

const navItems: NavItem[] = [
  { icon: <GridIcon />, key: "dashboard", path: "/" },
  { icon: <CheckCircleIcon />, key: "habits", path: "/habits" },
  { icon: <TimeIcon />, key: "schedule", path: "/schedule" },
  { icon: <ShootingStarIcon />, key: "goals", path: "/goals" },
  { icon: <PieChartIcon />, key: "analytics", path: "/analytics" },
  { icon: <DocsIcon />, key: "notes", path: "/notes" },
  { icon: <UserCircleIcon />, key: "userProfile", path: "/profile" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav) => (
        <li key={nav.key}>
          {nav.path && (
            <Link
              href={nav.path}
              target={nav.target}
              className={cn(
                "group menu-item",
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive",
              )}
            >
              <span
                className={cn(
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive",
                )}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span>{t(`items.${nav.key}`)}</span>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  return (
    <>
      {/* Close button visible inside the mobile drawer — xl:hidden because on
          desktop the sidebar is always visible and has no close affordance. */}
      {isMobileOpen && (
        <button
          onClick={() => setIsHovered(false)}
          className="fixed top-4 right-4 z-[51] flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-md xl:hidden dark:bg-gray-900 dark:text-gray-400"
          aria-label={tCommon("close")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
          </svg>
        </button>
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0",
          "dark:border-gray-800 dark:bg-gray-900",
          isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "xl:translate-x-0",
        )}
        aria-hidden={!isMobileOpen}
        inert={!isMobileOpen ? true : undefined}
      >
        <div
          className={cn(
            "flex py-8",
            !isExpanded && !isHovered ? "xl:justify-center" : "justify-start",
          )}
        >
          <Link href="/">
            {isExpanded || isHovered || isMobileOpen ? (
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
        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  className={cn(
                    "mb-4 flex text-xs leading-5 text-gray-400 uppercase",
                    !isExpanded && !isHovered ? "xl:justify-center" : "justify-start",
                  )}
                >
                  {isExpanded || isHovered || isMobileOpen
                    ? t("groups.menu")
                    : <HorizontaLDots />}
                </h2>
                {renderMenuItems(navItems)}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
