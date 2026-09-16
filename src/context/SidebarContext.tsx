"use client";

import { usePathname } from "@/i18n/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  isExpanded: boolean;
  /** True below the `xl` breakpoint, where the sidebar is a drawer. */
  isMobile: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
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

  const toggleMobileSidebar = () => {
    setMobileOpenAtPath((prev) => (prev === pathname ? null : pathname));
  };

  // Lock body scroll when the mobile drawer is open.
  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous || "";
    };
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobile,
        isMobileOpen,
        isHovered,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
