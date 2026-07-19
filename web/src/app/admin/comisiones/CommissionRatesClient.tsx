"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  employeeId: string;
  name: string;
  commissionPct: number;
};

export function CommissionRatesClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.employeeId, r.commissionPct])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(employeeId: string) {
    setSaving(employeeId);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          commissionPct: values[employeeId],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error || "No se pudo guardar");
        return;
      }
      setMsg(`% actualizado para ${rows.find((r) => r.employeeId === employeeId)?.name}`);
      router.refresh();
    } catch {
      setErr("Error de red");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {msg && <div className="flash flash-ok">{msg}</div>}
      {err && <div className="flash flash-error">{err}</div>}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Empleado</th>
              <th style={{ width: 120 }}>%</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employeeId}>
                <td>{r.name}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-control"
                    style={{ maxWidth: 88 }}
                    value={values[r.employeeId] ?? r.commissionPct}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [r.employeeId]: Number(e.target.value),
                      }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={saving === r.employeeId}
                    onClick={() => save(r.employeeId)}
                  >
                    {saving === r.employeeId ? "…" : "Guardar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
