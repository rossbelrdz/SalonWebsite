"use client";

import { useRouter } from "next/navigation";

export function ToggleBranch({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn btn-sm ${active ? "btn-secondary" : "btn-primary"}`}
      onClick={async () => {
        await fetch("/api/admin/branches", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, active: !active }),
        });
        router.refresh();
      }}
    >
      {active ? "Activa" : "Inactiva"}
    </button>
  );
}
