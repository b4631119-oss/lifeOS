"use client";

import { usePathname } from "@/i18n/navigation";
import { focusableWithin, trapIndex } from "@/lib/focusTrap";
import { DRAWER_SELECTOR, nextDrawerPath } from "@/lib/sidebar";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SidebarContextType = {
  isExpanded: boolean;
  /** True below the `lg` breakpoint, where the sidebar is a drawer. */
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
 * Kept in sync with the `lg` breakpoint by hand: the sidebar slides in with
 * `lg:translate-x-0`, so a mismatch would leave the sidebar inert while visible.
 *
 * 1024px, not 1280px. Above it the sidebar fits next to the content with room to
 * spare (at 1024 that is a 290px rail and roughly 690px of content), while a
 * tablet — or a laptop at 1024–1279 — was previously shown desktop content with
 * a phone's navigation: the worst of both, since the content had already given up
 * the drawer's full width. The cutoff is where a permanent navigation rail stops
 * costing the page more than it gives the user.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

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

  // While the drawer is open: lock body scroll, let Escape close it, and keep
  // Tab inside it.
  useEffect(() => {
    if (!isMobileOpen) return;

    /**
     * The drawer is a modal overlay. The page behind it is `inert` (see
     * `AdminLayout`), so its controls cannot be reached by keyboard — but Tab
     * from the last control *inside* the drawer still leaves the document and
     * moves into the browser chrome instead of wrapping, which is the gap this
     * closes. The two ends are handled by hand; the middle is the browser's
     * job, so nothing about normal tabbing changes. See `lib/focusTrap.ts`.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileSidebar();
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.from(
        document.querySelectorAll<HTMLElement>(DRAWER_SELECTOR),
      ).flatMap(focusableWithin);
      const current = items.indexOf(document.activeElement as HTMLElement);
      const target = trapIndex(items.length, current, event.shiftKey);

      if (target === null) return;

      event.preventDefault();
      items[target]?.focus();
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
