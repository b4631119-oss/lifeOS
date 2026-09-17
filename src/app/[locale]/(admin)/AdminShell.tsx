"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DayProvider } from "@/context/DayContext";
import { useRouter } from "@/i18n/navigation";
import AdminLayout from "@/layout/AdminLayout";
import { useEffect } from "react";

/**
 * The authenticated shell.
 *
 * Every route in this group requires a signed-in user, so a guest is sent to
 * the sign-in form. The public landing page is *not* part of this group any
 * more (it lives at `[locale]/page.tsx` as a Server Component): keeping it here
 * meant the landing was rendered by this client-side guard, which is why the
 * document a crawler received was a spinner and why the Firestore SDK was part
 * of the public page's bundle.
 */
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {/* The selected day is shared by Today and Schedule, so switching views
          cannot silently move the user to a different date. */}
      <DayProvider>
        <AdminGuard>{children}</AdminGuard>
      </DayProvider>
    </AuthProvider>
  );
}
