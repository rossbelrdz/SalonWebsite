import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { AccountClient } from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await readSession();
  if (!session) redirect("/login");

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
        <AccountClient />
      </div>
    </section>
  );
}
