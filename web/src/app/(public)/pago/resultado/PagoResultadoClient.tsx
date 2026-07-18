"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PagoResultadoClient() {
  const sp = useSearchParams();
  const status = sp.get("status") || "pending";
  const paymentId = sp.get("paymentId") || "";
  const appointmentId = sp.get("appointmentId") || "";
  const token = sp.get("token") || "";
  const [msg, setMsg] = useState("Verificando pago…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (token && paymentId) {
        try {
          const res = await fetch("/api/payments/capture-paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, token }),
          });
          const data = await res.json();
          if (!cancelled) {
            if (res.ok) {
              setMsg("Pago capturado correctamente.");
              setDone(true);
            } else {
              setMsg(data.error || "No se pudo capturar el pago de PayPal.");
            }
          }
          return;
        } catch {
          if (!cancelled) setMsg("Error al capturar PayPal.");
          return;
        }
      }

      if (status === "success") {
        setMsg("Pago recibido. Tu cita queda prepagada.");
        setDone(true);
      } else if (status === "failure") {
        setMsg("El pago no se completó. Puedes agendar de nuevo o pagar en salón.");
      } else {
        setMsg("Pago pendiente de confirmación. Te avisaremos cuando se acredite.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [status, paymentId, token]);

  const ok = status === "success" || done;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <div className="card-body text-center">
            <span
              className={`badge ${ok ? "badge-success" : status === "failure" ? "badge-danger" : "badge-warning"}`}
            >
              {ok ? "Pago" : status === "failure" ? "Fallido" : "Pendiente"}
            </span>
            <h1 style={{ fontSize: "1.4rem", marginTop: "0.75rem" }}>
              Resultado del prepago
            </h1>
            <p className="muted">{msg}</p>
            <div className="row" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
              {appointmentId && (
                <Link
                  href={`/confirmacion?id=${appointmentId}`}
                  className="btn btn-primary"
                >
                  Ver cita
                </Link>
              )}
              <Link href="/mis-citas" className="btn btn-secondary">
                Mis citas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
