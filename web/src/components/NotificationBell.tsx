"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  eventType: string;
  subject: string | null;
  body: string | null;
  createdAt: string;
  status: string;
};

export function NotificationBell({ href = "/cuenta" }: { href?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.items || []) as Item[];
      setItems(list.slice(0, 12));
      // “no leídas” = últimas 24h (sin read-state aún)
      const day = Date.now() - 24 * 60 * 60 * 1000;
      setUnread(list.filter((i) => new Date(i.createdAt).getTime() > day).length);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label="Notificaciones"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        style={{ position: "relative" }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 99,
              background: "var(--accent, #e36f4a)",
              color: "#fff",
              fontSize: 10,
              lineHeight: "16px",
              textAlign: "center",
              padding: "0 4px",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            width: 320,
            maxHeight: 380,
            overflow: "auto",
            zIndex: 50,
            boxShadow: "var(--shadow-lg, 0 12px 40px rgba(0,0,0,.12))",
          }}
        >
          <div className="card-body" style={{ padding: "0.75rem" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <strong className="small">Notificaciones</strong>
              <Link href={href} className="tiny" onClick={() => setOpen(false)}>
                Preferencias
              </Link>
            </div>
            {items.length === 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                Sin notificaciones recientes.
              </p>
            )}
            <div className="stack" style={{ gap: 8 }}>
              {items.map((n) => (
                <div
                  key={n.id}
                  style={{
                    borderBottom: "1px solid var(--border, #e8e2d8)",
                    paddingBottom: 6,
                  }}
                >
                  <div className="tiny muted">{n.eventType}</div>
                  <div className="small">
                    <strong>{n.subject || "Aviso"}</strong>
                  </div>
                  {n.body && (
                    <div className="tiny muted" style={{ whiteSpace: "pre-wrap" }}>
                      {n.body.slice(0, 120)}
                      {n.body.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
