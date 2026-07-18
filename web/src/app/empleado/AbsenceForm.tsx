"use client";

import { useState } from "react";

export function AbsenceForm() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo: dateTo || dateFrom, reason }),
      });
      const data = await res.json();
      if (!res.ok && !data.blocked) throw new Error(data.error || "Error");
      setMsg(data.message || "Solicitud enviada");
      if (data.blocked) setErr(data.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: "1.5rem" }}>
      <div className="card-body">
        <h3 style={{ marginTop: 0 }}>Solicitar ausencia</h3>
        <p className="small muted">
          Si tienes citas prepagadas en esas fechas, la solicitud queda bloqueada
          hasta que admin reasigne o se resuelvan.
        </p>
        {msg && <div className="flash flash-ok">{msg}</div>}
        {err && <div className="flash flash-error">{err}</div>}
        <div className="form-group">
          <label className="form-label">Desde</label>
          <input
            type="date"
            className="form-control"
            required
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Motivo</label>
          <input
            className="form-control"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enfermedad, permiso…"
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={loading}>
          {loading ? "Enviando…" : "Solicitar"}
        </button>
      </div>
    </form>
  );
}
