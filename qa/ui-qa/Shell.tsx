"use client";

import { AuthProvider } from "@/context/AuthContext";
import { DayProvider } from "@/context/DayContext";
import { SidebarProvider } from "@/context/SidebarContext";
import AdminLayout from "@/layout/AdminLayout";

/**
 * The real authenticated shell for the TEMPORARY QA screens — every context and
 * the real `AdminLayout`, minus the auth guard.
 *
 * The screens used to copy the shell's content box by hand, which is why a QA
 * pass could say "no overflow at 1024" about a layout the product never renders:
 * the sidebar, the drawer, the header and the margin between them were simply
 * not there. Loading this in an iframe of a given width measures the shell
 * itself, which is what a responsive claim is about.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DayProvider>
        <SidebarProvider>
          <AdminLayout>{children}</AdminLayout>
        </SidebarProvider>
      </DayProvider>
    </AuthProvider>
  );
}
