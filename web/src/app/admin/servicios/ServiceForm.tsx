"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ServiceForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        durationMin: Number(fd.get("durationMin")),
        price: Number(fd.get("price")),
        category: fd.get("category"),
        mediaClass: fd.get("mediaClass"),
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
        <label className="form-label">Descripción</label>
        <textarea name="description" className="form-control" />
      </div>
      <div className="form-group">
        <label className="form-label">Duración (min)</label>
        <input name="durationMin" type="number" className="form-control" defaultValue={45} required />
      </div>
      <div className="form-group">
        <label className="form-label">Precio (MXN)</label>
        <input name="price" type="number" step="0.01" className="form-control" defaultValue={350} required />
      </div>
      <div className="form-group">
        <label className="form-label">Categoría</label>
        <select name="category" className="form-control" defaultValue="HAIR">
          <option value="HAIR">Cabello</option>
          <option value="COLOR">Color</option>
          <option value="BEARD">Barba</option>
          <option value="NAILS">Uñas</option>
          <option value="MAKEUP">Maquillaje</option>
          <option value="SPA">Spa</option>
          <option value="OTHER">Otros</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Estilo visual</label>
        <select name="mediaClass" className="form-control" defaultValue="media-cut">
          <option value="media-cut">Corte</option>
          <option value="media-color">Color</option>
          <option value="media-beard">Barba</option>
          <option value="media-nails">Uñas</option>
          <option value="media-spa">Spa</option>
          <option value="media-makeup">Maquillaje</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "…" : "Crear"}
      </button>
    </form>
  );
}
