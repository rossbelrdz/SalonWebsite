"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BranchForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        address: fd.get("address"),
        city: fd.get("city"),
        phone: fd.get("phone"),
        openTime: fd.get("openTime"),
        closeTime: fd.get("closeTime"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="flash flash-error">{error}</div>}
      <div className="form-group">
        <label className="form-label">Nombre</label>
        <input name="name" className="form-control" required />
      </div>
      <div className="form-group">
        <label className="form-label">Dirección</label>
        <input name="address" className="form-control" required />
      </div>
      <div className="form-group">
        <label className="form-label">Ciudad</label>
        <input name="city" className="form-control" required />
      </div>
      <div className="form-group">
        <label className="form-label">Teléfono</label>
        <input name="phone" className="form-control" />
      </div>
      <div className="row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Abre</label>
          <input name="openTime" type="time" className="form-control" defaultValue="09:00" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Cierra</label>
          <input name="closeTime" type="time" className="form-control" defaultValue="19:00" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "…" : "Crear"}
      </button>
    </form>
  );
}
