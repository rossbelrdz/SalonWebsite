"use client";

import { useRouter } from "next/navigation";

export function AdminCancelButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      onClick={async () => {
        if (!confirm("¿Cancelar cita?")) return;
        await fetch(`/api/appointments/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Cancelada por admin" }),
        });
        router.refresh();
      }}
    >
      Cancelar
    </button>
  );
}
