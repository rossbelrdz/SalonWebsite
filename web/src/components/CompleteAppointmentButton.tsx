"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompleteAppointmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function complete() {
    if (!confirm("¿Marcar esta cita como completada?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "No se pudo completar");
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
      className="btn btn-secondary btn-sm"
      disabled={loading}
      onClick={complete}
    >
      {loading ? "…" : "Completar"}
    </button>
  );
}
