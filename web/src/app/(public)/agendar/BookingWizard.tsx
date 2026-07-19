"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, categoryLabel } from "@/lib/format";

type Branch = { id: string; name: string; address: string; city: string };
type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  mediaClass: string;
  imageUrl?: string | null;
  category: string;
};
type Employee = {
  id: string;
  name: string;
  title: string;
  branchIds: string[];
  serviceIds: string[];
};

const STEPS = ["Sucursal", "Servicio", "Profesional", "Fecha/hora", "Datos"];

export function BookingWizard(props: {
  branches: Branch[];
  services: Service[];
  employees: Employee[];
  discountPct: number;
  initialBranchId?: string;
  initialServiceId?: string;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState(props.initialBranchId || "");
  const [serviceId, setServiceId] = useState(props.initialServiceId || "");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState(props.defaultName);
  const [email, setEmail] = useState(props.defaultEmail);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [prepaid, setPrepaid] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const service = props.services.find((s) => s.id === serviceId);
  const filteredEmployees = useMemo(() => {
    return props.employees.filter(
      (e) =>
        (!branchId || e.branchIds.includes(branchId)) &&
        (!serviceId || e.serviceIds.includes(serviceId)),
    );
  }, [props.employees, branchId, serviceId]);

  const price = service
    ? prepaid
      ? Math.round(service.priceCents * (1 - props.discountPct / 100))
      : service.priceCents
    : 0;

  async function loadSlots(d: string, emp = employeeId) {
    if (!emp || !branchId || !serviceId || !d) return;
    setLoadingSlots(true);
    setTime("");
    try {
      const q = new URLSearchParams({
        employeeId: emp,
        branchId,
        serviceId,
        date: d,
      });
      const res = await fetch(`/api/slots?${q}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } finally {
      setLoadingSlots(false);
    }
  }

  function canNext() {
    if (step === 0) return Boolean(branchId);
    if (step === 1) return Boolean(serviceId);
    if (step === 2) return Boolean(employeeId);
    if (step === 3) return Boolean(date && time);
    return true;
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          serviceId,
          employeeId,
          date,
          time,
          clientName: name,
          clientEmail: email || null,
          clientPhone: phone || null,
          prepaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      if (prepaid && data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      const q = new URLSearchParams({ id: data.id });
      if (data.demo) q.set("demo", "1");
      if (prepaid) q.set("prepaid", "1");
      router.push(`/confirmacion?${q.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && <div className="flash flash-error">{error}</div>}

        {step === 0 && (
          <div className="stack">
            {props.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`card card-selectable ${branchId === b.id ? "is-selected" : ""}`}
                onClick={() => setBranchId(b.id)}
                style={{ textAlign: "left", width: "100%" }}
              >
                <div className="card-body">
                  <strong>{b.name}</strong>
                  <div className="small muted">
                    {b.address}, {b.city}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            {props.services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`card card-selectable ${serviceId === s.id ? "is-selected" : ""}`}
                onClick={() => {
                  setServiceId(s.id);
                  setEmployeeId("");
                }}
                style={{ textAlign: "left", width: "100%" }}
              >
                <div
                  className="card-body row"
                  style={{ justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}
                >
                  <div className="row" style={{ gap: "0.75rem", alignItems: "center", minWidth: 0 }}>
                    {s.imageUrl ? (
                      <Image
                        src={s.imageUrl}
                        alt=""
                        width={56}
                        height={42}
                        style={{
                          width: 56,
                          height: 42,
                          objectFit: "cover",
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        className={`media ${s.mediaClass}`}
                        style={{ width: 56, height: 42, aspectRatio: "auto", flexShrink: 0, borderRadius: 8 }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <span className="badge">{categoryLabel(s.category)}</span>
                      <div>
                        <strong>{s.name}</strong>
                      </div>
                      <div className="tiny muted">{s.durationMin} min</div>
                    </div>
                  </div>
                  <span className="price" style={{ flexShrink: 0 }}>
                    {formatPrice(s.priceCents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            {filteredEmployees.length === 0 && (
              <p className="muted">No hay profesionales para esa combinación.</p>
            )}
            {filteredEmployees.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`card card-selectable ${employeeId === e.id ? "is-selected" : ""}`}
                onClick={() => setEmployeeId(e.id)}
                style={{ textAlign: "left", width: "100%" }}
              >
                <div className="card-body">
                  <strong>{e.name}</strong>
                  <div className="small muted">{e.title}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input
                type="date"
                className="form-control"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setDate(e.target.value);
                  loadSlots(e.target.value);
                }}
              />
            </div>
            <div className="form-label" style={{ marginBottom: "0.5rem" }}>
              Horario disponible
            </div>
            {loadingSlots && <p className="small muted">Cargando…</p>}
            {!loadingSlots && date && slots.length === 0 && (
              <p className="muted small">Sin horarios ese día. Prueba otra fecha.</p>
            )}
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`slot-btn ${time === s ? "is-selected" : ""}`}
                  onClick={() => setTime(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              <input
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className="form-hint">Al menos correo o celular.</p>
            <label className="row" style={{ margin: "1rem 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prepaid}
                onChange={(e) => setPrepaid(e.target.checked)}
              />
              <span>
                Prepago con {props.discountPct}% de descuento
                {service && (
                  <>
                    {" "}
                    → <strong>{formatPrice(price)}</strong>
                    {prepaid && (
                      <span className="muted small">
                        {" "}
                        (antes {formatPrice(service.priceCents)})
                      </span>
                    )}
                  </>
                )}
              </span>
            </label>
            <p className="tiny muted">
              Con prepago se aplica el descuento y se abre la pasarela configurada
              (Mercado Pago, PayPal o Clip). Si el superadmin dejó modo demo, se
              confirma sin cobro real.
            </p>
          </div>
        )}

        <div className="row" style={{ marginTop: "1.5rem", justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-accent"
              disabled={submitting || !name || (!email && !phone)}
              onClick={submit}
            >
              {submitting
                ? "Procesando…"
                : prepaid
                  ? "Pagar y confirmar"
                  : "Confirmar cita"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
