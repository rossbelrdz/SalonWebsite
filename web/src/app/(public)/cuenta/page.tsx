import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { hasAdminAccess, hasStaffAccess } from "@/lib/auth";
import { AccountClient } from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const showAdmin = hasAdminAccess(session);
  const showEmpleado = hasStaffAccess(session);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-header">
          <div>
            <h2>Mi cuenta</h2>
            <p className="muted" style={{ margin: 0 }}>
              Datos, notificaciones, seguridad (MFA / Passkey)
            </p>
          </div>
        </div>

        {/* Enlaces a paneles privados: no van en el menú público como “menú admin” */}
        {(showAdmin || showEmpleado) && (
          <div
            className="card"
            style={{ marginBottom: "1.25rem" }}
          >
            <div className="card-body row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="small muted" style={{ width: "100%" }}>
                Accesos de trabajo
              </span>
              {showAdmin && (
                <Link href="/admin" className="btn btn-secondary btn-sm">
                  Panel admin
                </Link>
              )}
              {showEmpleado && (
                <Link href="/empleado" className="btn btn-ghost btn-sm">
                  Mi agenda (empleado)
                </Link>
              )}
              <Link href="/mis-citas" className="btn btn-ghost btn-sm">
                Mis citas
              </Link>
            </div>
          </div>
        )}

        <AccountClient />
      </div>
    </section>
  );
}
