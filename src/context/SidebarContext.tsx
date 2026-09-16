"use client";

import { usePathname } from "@/i18n/navigation";
import { nextDrawerPath } from "@/lib/sidebar";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SidebarContextType = {
  isExpanded: boolean;
  /** True below the `xl` breakpoint, where the sidebar is a drawer. */
  isMobile: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  /** Closes the drawer unconditionally — the close button, backdrop and Escape. */
  closeMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

/**
 * Kept in sync with the `xl` breakpoint by hand: the drawer slides in with
 * `xl:translate-x-0`, so a mismatch would leave the sidebar inert while visible.
 */
const DESKTOP_QUERY = "(min-width: 1280px)";

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  /**
   * The route the mobile drawer was opened on, rather than a boolean: a
   * navigation changes `pathname`, which closes the drawer by itself. That is
   * what the old "close on route change" effect did, without the extra render.
   */
  const [mobileOpenAtPath, setMobileOpenAtPath] = useState<string | null>(null);
  const pathname = usePathname();
  const isMobileOpen = mobileOpenAtPath === pathname;

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      setIsMobile(!query.matches);
      if (query.matches) setMobileOpenAtPath(null);
    };

    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  // Both actions go through the same pure rule (`lib/sidebar.ts`), so "close"
  // cannot drift from what the drawer is actually storing.
  const toggleMobileSidebar = useCallback(() => {
    setMobileOpenAtPath((previous) =>
      nextDrawerPath("toggle", pathname, previous),
    );
  }, [pathname]);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpenAtPath((previous) =>
      nextDrawerPath("close", pathname, previous),
    );
  }, [pathname]);

  // While the drawer is open: lock body scroll, and let Escape close it.
  useEffect(() => {
    if (!isMobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar();
    };
    document.addEventListener("keydown", onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous || "";
    };
  }, [isMobileOpen, closeMobileSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobile,
        isMobileOpen,
        isHovered,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        setIsHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
