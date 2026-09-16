import type { Metadata } from "next";
import AdminShell from "./AdminShell";

/**
 * Keeps the authenticated app out of search results.
 *
 * Every route in this group serves a shell that gets its content after a
 * Firebase auth round trip, so a crawler sees an empty document. `robots.txt`
 * already disallows these paths; this is the part that works even when a crawler
 * arrives from an external link and ignores the file.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Server wrapper.  The actual auth guard, sidebar and header live in the
 * client AdminShell so that browser APIs are available.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
