/**
 * Shell C — área empleado (sidebar reducido). No PublicNav.
 * @see docs/patterns/app-shells.md
 */
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { hasStaffAccess } from "@/lib/auth";
import { EmpleadoShell } from "@/components/EmpleadoShell";

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!hasStaffAccess(session)) redirect("/");

  return (
    <div className="admin-body">
      <EmpleadoShell
        userName={session.name}
        showAdmin={session.isSuperAdmin || session.role === "ADMIN"}
      >
        {children}
      </EmpleadoShell>
    </div>
  );
}
