"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { usePathname, useRouter } from "@/i18n/navigation";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import dynamic from "next/dynamic";
import React, { useEffect } from "react";

/**
 * Loaded only by signed-out visitors on the home route, so it stays out of the
 * chunk every other (admin) page ships.
 */
const LandingView = dynamic(() => import("@/components/landing/LandingView"));

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // A signed-out visitor on the home route gets the landing page instead of the
  // dashboard; every other route keeps bouncing to the sign-in form.
  const isHome = pathname === "/";

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "xl:ml-[290px]"
      : "xl:ml-[90px]";

  useEffect(() => {
    if (!loading && !user && !isHome) {
      router.replace("/signin");
    }
  }, [loading, user, isHome, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      </div>
    );
  }

  if (!user) {
    return isHome ? <LandingView /> : null;
  }

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
