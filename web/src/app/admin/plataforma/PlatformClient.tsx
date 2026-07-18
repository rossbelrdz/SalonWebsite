"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  activePaymentProvider: string;
  enableMercadoPago: boolean;
  enablePayPal: boolean;
  enableClip: boolean;
  allowDemoPayments: boolean;
};

export function PlatformClient({
  initial,
  labels,
}: {
  initial: Initial;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.activePaymentProvider);
  const [demo, setDemo] = useState(initial.allowDemoPayments);
  const [mp, setMp] = useState(initial.enableMercadoPago);
  const [pp, setPp] = useState(initial.enablePayPal);
  const [clip, setClip] = useState(initial.enableClip);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activePaymentProvider: provider,
          allowDemoPayments: demo,
          enableMercadoPago: mp,
          enablePayPal: pp,
          enableClip: clip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMsg("Guardado");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="card-body">
        {msg && <div className="flash flash-ok">{msg}</div>}
        {err && <div className="flash flash-error">{err}</div>}

        <div className="form-group">
          <label className="form-label">Pasarela activa</label>
          <select
            className="form-control"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {(["NONE", "MERCADOPAGO", "PAYPAL", "CLIP"] as const).map((id) => (
              <option key={id} value={id}>
                {labels[id] || id}
              </option>
            ))}
          </select>
          <p className="form-hint">
            Los tenants configuran credenciales en <strong>Configuración → Pagos</strong>.
            Con <em>Demo / sin pasarela</em> el prepago se marca pagado sin cobro real
            (útil en desarrollo).
          </p>
        </div>

        <label className="row" style={{ marginBottom: "0.65rem", cursor: "pointer" }}>
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          <span>Permitir pagos demo si faltan credenciales</span>
        </label>
        <label className="row" style={{ marginBottom: "0.65rem", cursor: "pointer" }}>
          <input type="checkbox" checked={mp} onChange={(e) => setMp(e.target.checked)} />
          <span>Habilitar Mercado Pago en la plataforma</span>
        </label>
        <label className="row" style={{ marginBottom: "0.65rem", cursor: "pointer" }}>
          <input type="checkbox" checked={pp} onChange={(e) => setPp(e.target.checked)} />
          <span>Habilitar PayPal</span>
        </label>
        <label className="row" style={{ marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={clip} onChange={(e) => setClip(e.target.checked)} />
          <span>Habilitar Clip.mx</span>
        </label>

        <div className="card" style={{ background: "var(--surface-2, #f6f4ef)", marginBottom: "1rem" }}>
          <div className="card-body small">
            <strong>APIs</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
              <li>
                <strong>Mercado Pago:</strong> Checkout Pro →{" "}
                <code>POST /checkout/preferences</code>
              </li>
              <li>
                <strong>PayPal:</strong> Orders v2 + capture
              </li>
              <li>
                <strong>Clip:</strong>{" "}
                <code>POST https://api.payclip.com/v2/checkout</code>
              </li>
            </ul>
          </div>
        </div>

        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar plataforma"}
        </button>
      </div>
    </div>
  );
}
