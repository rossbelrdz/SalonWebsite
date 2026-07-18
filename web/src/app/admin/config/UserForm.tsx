"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserForm({ defaultRole = "EMPLOYEE" }: { defaultRole?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email") || null,
        phone: fd.get("phone") || null,
        role: fd.get("role"),
        password: fd.get("password") || "demo1234",
        title: fd.get("title"),
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
        <label className="form-label">Correo</label>
        <input name="email" type="email" className="form-control" />
      </div>
      <div className="form-group">
        <label className="form-label">Celular</label>
        <input name="phone" className="form-control" />
      </div>
      <div className="form-group">
        <label className="form-label">Rol</label>
        <select name="role" className="form-control" defaultValue={defaultRole}>
          <option value="ADMIN">Admin</option>
          <option value="EMPLOYEE">Empleado</option>
          <option value="CLIENT">Cliente</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Título (si empleado)</label>
        <input name="title" className="form-control" placeholder="Estilista" />
      </div>
      <div className="form-group">
        <label className="form-label">Contraseña temporal</label>
        <input name="password" className="form-control" defaultValue="demo1234" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "…" : "Crear usuario"}
      </button>
    </form>
  );
}
