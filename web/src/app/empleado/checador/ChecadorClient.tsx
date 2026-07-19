"use client";

import { useCallback, useEffect, useState } from "react";

type Branch = { id: string; name: string };

type ClockState = {
  workDate: string;
  timezone: string;
  serverTimeHm: string;
  schedule: { start: string; end: string } | null;
  entry: {
    id: string;
    checkInHm: string;
    checkOutHm: string | null;
  } | null;
  open: boolean;
  status: string;
  statusLabel: string;
  branches: Branch[];
};

export function ChecadorClient({
  initial,
}: {
  initial: ClockState;
}) {
  const [data, setData] = useState(initial);
  const [clock, setClock] = useState(initial.serverTimeHm);
  const [branchId, setBranchId] = useState(initial.branches[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/attendance/clock", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as ClockState;
    setData(json);
    setClock(json.serverTimeHm);
    if (!branchId && json.branches[0]) setBranchId(json.branches[0].id);
  }, [branchId]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: data.timezone || "America/Mexico_City",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now),
      );
    }, 1000);
    return () => clearInterval(t);
  }, [data.timezone]);

  useEffect(() => {
    const t = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function act(action: "in" | "out") {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, branchId: branchId || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "No se pudo registrar");
        return;
      }
      setMsg(action === "in" ? "Entrada registrada" : "Salida registrada");
      await refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const canIn = !data.entry;
  const canOut = Boolean(data.open || (data.entry && !data.entry.checkOutHm));

  return (
    <div className="checador" style={{ maxWidth: 420 }}>
      <div className="card text-center">
        <div className="card-body" style={{ padding: "2rem 1.25rem" }}>
          <div className="tiny muted">Hora del salón · {data.timezone}</div>
          <div
            className="price"
            style={{ fontSize: "clamp(2rem, 8vw, 2.75rem)", margin: "0.5rem 0" }}
            aria-live="polite"
          >
            {clock}
          </div>
          <div className="small muted" style={{ marginBottom: "0.75rem" }}>
            {data.workDate}
            {data.schedule
              ? ` · Turno ${data.schedule.start}–${data.schedule.end}`
              : " · Sin turno hoy"}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <span
              className={
                data.status === "retraso"
                  ? "badge badge-warning"
                  : data.status === "ausente"
                    ? "badge badge-danger"
                    : data.status === "presente" || data.status === "completo"
                      ? "badge badge-success"
                      : "badge"
              }
            >
              {data.statusLabel}
            </span>
          </div>

          {data.entry ? (
            <p className="small" style={{ margin: "0 0 1rem" }}>
              Entrada: <strong>{data.entry.checkInHm}</strong>
              {data.entry.checkOutHm ? (
                <>
                  {" "}
                  · Salida: <strong>{data.entry.checkOutHm}</strong>
                </>
              ) : (
                " · Sin salida"
              )}
            </p>
          ) : (
            <p className="small muted" style={{ margin: "0 0 1rem" }}>
              Aún no registras entrada hoy
            </p>
          )}

          {data.branches.length > 1 && canIn && (
            <label className="stack" style={{ gap: 6, marginBottom: "1rem", textAlign: "left" }}>
              <span className="tiny muted">Sucursal</span>
              <select
                className="form-control"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <div className="flash flash-error" style={{ marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}
          {msg && (
            <div className="flash flash-ok" style={{ marginBottom: "0.75rem" }}>
              {msg}
            </div>
          )}

          {canIn && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={loading}
              onClick={() => act("in")}
            >
              {loading ? "Registrando…" : "Registrar entrada"}
            </button>
          )}
          {canOut && (
            <button
              type="button"
              className="btn btn-accent btn-block"
              disabled={loading}
              onClick={() => act("out")}
              style={{ marginTop: canIn ? "0.5rem" : 0 }}
            >
              {loading ? "Registrando…" : "Registrar salida"}
            </button>
          )}
          {data.entry?.checkOutHm && (
            <p className="tiny muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
              Jornada cerrada por hoy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
