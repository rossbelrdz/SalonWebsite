"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Emp = { id: string; name: string };

export function ReassignButton({
  id,
  employees,
}: {
  id: string;
  employees: Emp[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/appointments/${id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedEmployeeId: employeeId, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(true)}>
        Reasignar
      </button>
    );
  }

  return (
    <div style={{ minWidth: 200 }}>
      {err && <div className="tiny" style={{ color: "var(--danger)" }}>{err}</div>}
      <select
        className="form-control"
        style={{ marginBottom: 4, fontSize: "0.85rem" }}
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      >
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <input
        className="form-control"
        style={{ marginBottom: 4, fontSize: "0.85rem" }}
        placeholder="Nota al cliente"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="row" style={{ gap: 4 }}>
        <button type="button" className="btn btn-sm btn-primary" disabled={loading} onClick={submit}>
          Enviar
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
    </div>
  );
}
