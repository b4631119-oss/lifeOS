import AdminShell from "./AdminShell";

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
