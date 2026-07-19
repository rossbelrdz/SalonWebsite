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

const STEPS = [
  "Sucursal",
  "Categorías",
  "Servicios",
  "Profesional",
  "Fecha/hora",
  "Datos",
];

const CATEGORY_ORDER = [
  "HAIR",
  "COLOR",
  "BEARD",
  "NAILS",
  "SPA",
  "MAKEUP",
  "OTHER",
] as const;

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
  const initialSvc = props.services.find((s) => s.id === props.initialServiceId);

  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState(props.initialBranchId || "");
  const [categories, setCategories] = useState<string[]>(
    initialSvc ? [initialSvc.category] : [],
  );
  const [serviceIds, setServiceIds] = useState<string[]>(
    props.initialServiceId ? [props.initialServiceId] : [],
  );
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

  const availableCategories = useMemo(() => {
    const present = new Set(props.services.map((s) => s.category));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c)) as string[];
    for (const c of present) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    return ordered;
  }, [props.services]);

  const selectedServices = useMemo(
    () =>
      serviceIds
        .map((id) => props.services.find((s) => s.id === id))
        .filter(Boolean) as Service[],
    [props.services, serviceIds],
  );

  const servicesInCategories = useMemo(() => {
    if (categories.length === 0) return [];
    return props.services.filter((s) => categories.includes(s.category));
  }, [props.services, categories]);

  const totalDuration = selectedServices.reduce((s, x) => s + x.durationMin, 0);
  const totalPrice = selectedServices.reduce((s, x) => s + x.priceCents, 0);
  const pricePrepaid = Math.round(totalPrice * (1 - props.discountPct / 100));
  const displayPrice = prepaid ? pricePrepaid : totalPrice;

  const filteredEmployees = useMemo(() => {
    return props.employees.filter((e) => {
      if (branchId && !e.branchIds.includes(branchId)) return false;
      if (serviceIds.length === 0) return true;
      return serviceIds.every((sid) => e.serviceIds.includes(sid));
    });
  }, [props.employees, branchId, serviceIds]);

  function toggleCategory(cat: string) {
    setCategories((prev) => {
      const next = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];
      // Quitar servicios de categorías desmarcadas
      setServiceIds((ids) =>
        ids.filter((id) => {
          const s = props.services.find((x) => x.id === id);
          return s && next.includes(s.category);
        }),
      );
      setEmployeeId("");
      return next;
    });
  }

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setEmployeeId("");
    setTime("");
    setSlots([]);
  }

  async function loadSlots(d: string, emp = employeeId) {
    if (!emp || !branchId || serviceIds.length === 0 || !d) return;
    setLoadingSlots(true);
    setTime("");
    try {
      const q = new URLSearchParams({
        employeeId: emp,
        branchId,
        serviceIds: serviceIds.join(","),
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
    if (step === 1) return categories.length > 0;
    if (step === 2) return serviceIds.length > 0;
    if (step === 3) return Boolean(employeeId);
    if (step === 4) return Boolean(date && time);
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
          serviceIds,
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

  const summary =
    selectedServices.length > 0 ? (
      <div className="booking-summary tiny muted">
        <strong style={{ color: "var(--ink)" }}>
          {selectedServices.length}{" "}
          {selectedServices.length === 1 ? "servicio" : "servicios"}
        </strong>
        {" · "}
        {totalDuration} min · {formatPrice(totalPrice)}
        {selectedServices.length > 1 && (
          <div className="tiny" style={{ marginTop: 2 }}>
            {selectedServices.map((s) => s.name).join(" · ")}
          </div>
        )}
      </div>
    ) : null;

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
            <p className="small muted" style={{ marginTop: 0 }}>
              Elige dónde quieres tu cita
            </p>
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
          <div>
            <p className="small muted" style={{ marginTop: 0 }}>
              Selecciona una o más categorías (p. ej. Color y Uñas)
            </p>
            <div className="filters servicios-tabs" style={{ marginBottom: "0.75rem" }}>
              {availableCategories.map((c) => {
                const count = props.services.filter((s) => s.category === c).length;
                const active = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip${active ? " is-active" : ""}`}
                    onClick={() => toggleCategory(c)}
                    aria-pressed={active}
                  >
                    {categoryLabel(c)}
                    <span className="chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
            {categories.length > 0 && (
              <p className="tiny muted">
                Elegidas: {categories.map((c) => categoryLabel(c)).join(", ")}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <p className="small muted" style={{ marginTop: 0 }}>
              Marca uno o más servicios. El tiempo del profesional se suma al final.
            </p>
            {servicesInCategories.length === 0 && (
              <p className="muted">No hay servicios en esas categorías.</p>
            )}
            {servicesInCategories.map((s) => {
              const selected = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`card card-selectable ${selected ? "is-selected" : ""}`}
                  onClick={() => toggleService(s.id)}
                  style={{ textAlign: "left", width: "100%" }}
                  aria-pressed={selected}
                >
                  <div
                    className="card-body row"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      className="row"
                      style={{ gap: "0.75rem", alignItems: "center", minWidth: 0 }}
                    >
                      <span
                        className={`booking-check${selected ? " is-on" : ""}`}
                        aria-hidden
                      >
                        {selected ? "✓" : ""}
                      </span>
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
                          style={{
                            width: 56,
                            height: 42,
                            aspectRatio: "auto",
                            flexShrink: 0,
                            borderRadius: 8,
                          }}
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
              );
            })}
            {summary}
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            {summary}
            {filteredEmployees.length === 0 && (
              <p className="muted">
                No hay un profesional que ofrezca todos los servicios elegidos en
                esa sucursal. Quita un servicio o cambia de sucursal.
              </p>
            )}
            {filteredEmployees.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`card card-selectable ${employeeId === e.id ? "is-selected" : ""}`}
                onClick={() => {
                  setEmployeeId(e.id);
                  if (date) loadSlots(date, e.id);
                }}
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

        {step === 4 && (
          <div>
            {summary}
            <p className="small muted">
              Bloqueo de <strong>{totalDuration} min</strong> en la agenda del
              profesional
            </p>
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
              <p className="muted small">
                Sin huecos de {totalDuration} min ese día. Prueba otra fecha.
              </p>
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

        {step === 5 && (
          <div>
            {summary}
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
                {selectedServices.length > 0 && (
                  <>
                    {" "}
                    → <strong>{formatPrice(displayPrice)}</strong>
                    {prepaid && (
                      <span className="muted small">
                        {" "}
                        (antes {formatPrice(totalPrice)})
                      </span>
                    )}
                  </>
                )}
              </span>
            </label>
            <p className="tiny muted">
              Con prepago se aplica el descuento sobre el total de los servicios y
              se abre la pasarela configurada.
            </p>
          </div>
        )}

        <div
          className="row"
          style={{ marginTop: "1.5rem", justifyContent: "space-between" }}
        >
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
