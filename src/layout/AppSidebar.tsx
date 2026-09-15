"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocsIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  ShootingStarIcon,
  TableIcon,
  TimeIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  target?: string;
  subItems?: {
    key: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    target?: string;
  }[];
};

/** Which menu a submenu belongs to, and where it sits in that menu. */
type SubmenuTarget = {
  type: "main" | "support" | "others";
  index: number;
};

/** The menu of the submenu that owns `path`, or `null` for a top-level route. */
function findRouteSubmenu(path: string): SubmenuTarget | null {
  const menus: [SubmenuTarget["type"], NavItem[]][] = [
    ["main", navItems],
    ["others", othersItems],
  ];

  for (const [type, items] of menus) {
    const index = items.findIndex((nav) =>
      nav.subItems?.some((subItem) => subItem.path === path),
    );

    if (index !== -1) return { type, index };
  }

  return null;
}

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    key: "dashboard",
    subItems: [{ key: "ecommerceHome", path: "/" }],
  },
  {
    icon: <CheckCircleIcon />,
    key: "habits",
    path: "/habits",
  },
  {
    icon: <TimeIcon />,
    key: "schedule",
    path: "/schedule",
  },
  {
    icon: <ShootingStarIcon />,
    key: "goals",
    path: "/goals",
  },
  {
    icon: <PieChartIcon />,
    key: "analytics",
    path: "/analytics",
  },
  {
    icon: <DocsIcon />,
    key: "notes",
    path: "/notes",
  },
  {
    icon: <CalenderIcon />,
    key: "calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircleIcon />,
    key: "userProfile",
    path: "/profile",
  },
  {
    key: "forms",
    icon: <ListIcon />,
    subItems: [{ key: "formElements", path: "/form-elements", pro: false }],
  },
  {
    key: "tables",
    icon: <TableIcon />,
    subItems: [{ key: "basicTables", path: "/basic-tables", pro: false }],
  },
  {
    key: "pages",
    icon: <PageIcon />,
    subItems: [
      { key: "blankPage", path: "/blank" },
      { key: "error404", path: "/error-404" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    key: "charts",
    subItems: [
      { key: "lineChart", path: "/line-chart", pro: false },
      { key: "barChart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    key: "uiElements",
    subItems: [
      { key: "alerts", path: "/alerts" },
      { key: "avatar", path: "/avatars" },
      { key: "badge", path: "/badge" },
      { key: "buttons", path: "/buttons" },
      { key: "images", path: "/images" },
      { key: "videos", path: "/videos" },
    ],
  },
  {
    icon: <PlugInIcon />,
    key: "authentication",
    subItems: [
      { key: "signIn", path: "/signin", pro: false },
      { key: "signUp", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support" | "others",
  ) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.key}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={cn(
                "group menu-item cursor-pointer",
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive",
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start",
              )}
            >
              <span
                className={cn(
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive",
                )}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{t(`items.${nav.key}`)}</span>
              )}
              {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                <span
                  className={cn(
                    "inset-e-10 absolute ms-auto",
                    openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "menu-dropdown-badge-active"
                      : "menu-dropdown-badge-inactive",
                    "menu-dropdown-badge",
                  )}
                >
                  {t("badges.new")}
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={cn(
                    "ms-auto h-5 w-5 transition-transform duration-200",
                    openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : "",
                  )}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                target={nav.target}
                className={cn(
                  "group menu-item",
                  isActive(nav.path)
                    ? "menu-item-active"
                    : "menu-item-inactive",
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
                  <span className="menu-item-text">
                    {t(`items.${nav.key}`)}
                  </span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="ms-9 mt-2 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.key}>
                    <Link
                      href={subItem.path}
                      target={subItem.target}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {t(`items.${subItem.key}`)}
                      <span className="ms-auto flex items-center gap-1">
                        {subItem.new && (
                          <span
                            className={`ms-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            {t("badges.new")}
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ms-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-pro-active"
                                : "menu-dropdown-badge-pro-inactive"
                            } menu-dropdown-badge-pro`}
                          >
                            {t("badges.pro")}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // The submenu the current route belongs to. Derived from `pathname` during
  // render instead of being copied into state from an effect, so a navigation
  // opens (or closes) it in the same pass — no extra render, no flicker.
  const routeSubmenu = findRouteSubmenu(pathname);

  /**
   * A manual toggle is remembered per route: navigating away drops it and the
   * route's own submenu wins again, which is how the old pathname effect
   * behaved.
   */
  const [toggledSubmenu, setToggledSubmenu] = useState<{
    path: string;
    submenu: SubmenuTarget | null;
  } | null>(null);

  const openSubmenu =
    toggledSubmenu?.path === pathname ? toggledSubmenu.submenu : routeSubmenu;

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: SubmenuTarget["type"],
  ) => {
    const isOpen = openSubmenu?.type === menuType && openSubmenu.index === index;

    setToggledSubmenu({
      path: pathname,
      submenu: isOpen ? null : { type: menuType, index },
    });
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:mt-0 rtl:right-0 rtl:left-auto rtl:border-r-0 rtl:border-l dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full"
      } xl:translate-x-0 xl:rtl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
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
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.menu")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("groups.others")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
