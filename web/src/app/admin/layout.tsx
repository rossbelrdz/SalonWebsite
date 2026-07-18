import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { hasAdminAccess } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!hasAdminAccess(session)) redirect("/");

  return (
    <div className="admin-body">
      <AdminShell isSuperAdmin={session.isSuperAdmin} userName={session.name}>
        {children}
      </AdminShell>
    </div>
  );
}
