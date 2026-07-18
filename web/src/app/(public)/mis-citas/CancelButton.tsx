"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm("¿Cancelar esta cita?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelada por el cliente" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "No se pudo cancelar");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      onClick={cancel}
      disabled={loading}
    >
      {loading ? "…" : "Cancelar cita"}
    </button>
  );
}
