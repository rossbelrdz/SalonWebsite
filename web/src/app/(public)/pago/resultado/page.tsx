import { Suspense } from "react";
import { PagoResultadoClient } from "./PagoResultadoClient";

export default function PagoResultadoPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container">
            <p className="muted">Cargando…</p>
          </div>
        </section>
      }
    >
      <PagoResultadoClient />
    </Suspense>
  );
}
