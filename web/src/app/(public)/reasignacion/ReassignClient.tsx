"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Emp = { id: string; name: string };

export function ReassignClient({
  appointmentId,
  proposedName,
  note,
  employees,
}: {
  appointmentId: string;
  proposedName: string | null;
  note: string | null;
  employees: Emp[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");

  async function choose(choice: string, extra: Record<string, string> = {}) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reassign-choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      router.push("/mis-citas");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      {error && <div className="flash flash-error">{error}</div>}
      {note && <p className="muted small">Nota del salón: {note}</p>}

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>A) Aceptar nuevo profesional</h3>
          <p className="muted small">
            Mantener fecha y hora con {proposedName || "el profesional propuesto"}.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !proposedName}
            onClick={() => choose("ACCEPT_NEW")}
          >
            Aceptar {proposedName || "—"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>B) Reagendar</h3>
          <p className="muted small">Elige nueva fecha, hora y profesional.</p>
          <div className="form-group">
            <label className="form-label">Profesional</label>
            <select
              className="form-control"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-control"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Hora (HH:mm)</label>
            <input
              type="time"
              className="form-control"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || !date || !time}
            onClick={() =>
              choose("RESCHEDULE", { date, time, employeeId })
            }
          >
            Confirmar reagenda
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>C) Cancelar y reembolso</h3>
          <p className="muted small">
            Se cancela la cita y se aplica la política de reembolso del negocio.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
            disabled={loading}
            onClick={() => choose("CANCEL_REFUND")}
          >
            Cancelar cita
          </button>
        </div>
      </div>
    </div>
  );
}
