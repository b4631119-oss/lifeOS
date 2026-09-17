"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { isDrawerTrapped } from "@/lib/sidebar";
import React from "react";

/**
 * The shape of an authenticated screen: navigation, header, and the content
 * column with the offset the sidebar imposes on it.
 *
 * Split out from the auth guard in `AdminShell` so the geometry can be rendered
 * without an account. That is not a detail of the test harness — it is the only
 * way the shell can be *measured* at a given width before a user is signed in,
 * and every "does this fit on a phone" question is a question about this file:
 * whether the drawer covers the content, whether the sidebar starts at the right
 * breakpoint, and whether the content column ever scrolls sideways.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isMobile, isHovered, isMobileOpen } = useSidebar();

  // Below `lg` the navigation is a drawer, so the content simply takes the whole
  // width — `isMobileOpen` also has to clear the margin, since a drawer that is
  // open is overlaying the page rather than sitting beside it.
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  // While the drawer is open it is the whole interface: everything behind it —
  // this column and its header — is taken out of the tab order and hidden from
  // assistive technology, so focus and the screen reader have only the drawer to
  // move through. On desktop `isDrawerTrapped` is false and the sidebar sits
  // beside the content as usual.
  const drawerCoversPage = isDrawerTrapped(isMobile, isMobileOpen);

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <Backdrop />
      <main
        inert={drawerCoversPage || undefined}
        aria-hidden={drawerCoversPage || undefined}
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) px-4 pt-4 pb-10 md:px-6 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
