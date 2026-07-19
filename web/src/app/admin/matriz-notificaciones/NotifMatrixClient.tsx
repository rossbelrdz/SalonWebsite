"use client";

import { useCallback, useEffect, useState } from "react";

type TelegramRouteMode = "USER_LINKED" | "TARGETS" | "BOTH";

type Channels = {
  email: boolean;
  telegram: boolean;
  inApp: boolean;
  push: boolean;
  telegramMode: TelegramRouteMode;
  telegramTargetIds: string[];
};

type EventDef = { eventType: string; label: string };
type Audience = { code: string; label: string };
type TgTarget = {
  id: string;
  label: string;
  kind: string;
  chatId: string;
  isDefaultOps: boolean;
};

const CHANNEL_LABELS: Record<"email" | "telegram" | "inApp" | "push", string> = {
  email: "Email",
  telegram: "Telegram",
  inApp: "In-app",
  push: "Push",
};

const MODE_LABELS: Record<TelegramRouteMode, string> = {
  USER_LINKED: "Usuario vinculado",
  TARGETS: "Destinos ops",
  BOTH: "Ambos",
};

function emptyCh(): Channels {
  return {
    email: false,
    telegram: false,
    inApp: false,
    push: false,
    telegramMode: "USER_LINKED",
    telegramTargetIds: [],
  };
}

export function NotifMatrixClient() {
  const [events, setEvents] = useState<EventDef[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, Channels>>>({});
  const [targets, setTargets] = useState<TgTarget[]>([]);
  const [dirty, setDirty] = useState<(Channels & { eventType: string; audience: string })[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [audienceFocus, setAudienceFocus] = useState("CLIENT");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/notification-matrix");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sin permiso");
      setEvents(data.events);
      setAudiences(data.audiences);
      setMatrix(data.matrix);
      setTargets(data.targets || []);
      setDirty([]);
      if (data.audiences?.[0]) setAudienceFocus(data.audiences[0].code);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function markDirty(eventType: string, audience: string, next: Channels) {
    setMatrix((m) => ({
      ...m,
      [eventType]: { ...m[eventType], [audience]: next },
    }));
    setDirty((d) => {
      const rest = d.filter(
        (x) => !(x.eventType === eventType && x.audience === audience),
      );
      return [...rest, { eventType, audience, ...next }];
    });
  }

  function toggle(
    eventType: string,
    audience: string,
    channel: "email" | "telegram" | "inApp" | "push",
  ) {
    const cur = matrix[eventType]?.[audience] || emptyCh();
    const next = { ...cur, [channel]: !cur[channel] };
    // Si se activa telegram en ADMIN y mode es USER_LINKED, sugerir TARGETS
    if (
      channel === "telegram" &&
      next.telegram &&
      audience === "ADMIN" &&
      next.telegramMode === "USER_LINKED"
    ) {
      next.telegramMode = "TARGETS";
    }
    markDirty(eventType, audience, next);
  }

  function setMode(eventType: string, audience: string, mode: TelegramRouteMode) {
    const cur = matrix[eventType]?.[audience] || emptyCh();
    markDirty(eventType, audience, { ...cur, telegramMode: mode });
  }

  function toggleTarget(eventType: string, audience: string, targetId: string) {
    const cur = matrix[eventType]?.[audience] || emptyCh();
    const ids = new Set(cur.telegramTargetIds || []);
    if (ids.has(targetId)) ids.delete(targetId);
    else ids.add(targetId);
    markDirty(eventType, audience, {
      ...cur,
      telegramTargetIds: Array.from(ids),
    });
  }

  async function save() {
    setMsg("");
    setErr("");
    const res = await fetch("/api/admin/notification-matrix", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: dirty }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error");
      return;
    }
    setMsg(`Guardado (${dirty.length} filas)`);
    setDirty([]);
  }

  async function resetDefaults() {
    if (!confirm("¿Restaurar defaults de la matriz de notificaciones?")) return;
    const res = await fetch("/api/admin/notification-matrix", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error");
      return;
    }
    setMsg("Defaults restaurados");
    load();
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (err && events.length === 0) {
    return <div className="flash flash-error">{err}</div>;
  }

  const channels = Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[];
  const showTargetUi = audienceFocus === "ADMIN";

  return (
    <div>
      {msg && <div className="flash flash-ok">{msg}</div>}
      {err && <div className="flash flash-error">{err}</div>}

      <div className="row" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <label className="small">
          Audiencia:{" "}
          <select
            className="form-control"
            style={{ display: "inline-block", width: "auto" }}
            value={audienceFocus}
            onChange={(e) => setAudienceFocus(e.target.value)}
          >
            {audiences.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={dirty.length === 0}
          onClick={save}
        >
          Guardar ({dirty.length})
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={resetDefaults}>
          Restaurar defaults
        </button>
      </div>

      <p className="small muted">
        Vista por audiencia. Preferencias del usuario se aplican encima en canales
        personales. En ADMIN con Telegram, elige modo (usuario / destinos ops) y
        opcionalmente destinos concretos.
      </p>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Evento</th>
                {channels.map((c) => (
                  <th key={c} style={{ textAlign: "center" }}>
                    {CHANNEL_LABELS[c]}
                  </th>
                ))}
                {showTargetUi && <th>Telegram route</th>}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const ch = matrix[ev.eventType]?.[audienceFocus] || emptyCh();
                return (
                  <tr key={ev.eventType}>
                    <td>
                      <div className="small">{ev.label}</div>
                      <div className="tiny muted">{ev.eventType}</div>
                    </td>
                    {channels.map((c) => (
                      <td key={c} style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(ch[c])}
                          onChange={() => toggle(ev.eventType, audienceFocus, c)}
                        />
                      </td>
                    ))}
                    {showTargetUi && (
                      <td style={{ minWidth: 220 }}>
                        {ch.telegram ? (
                          <div>
                            <select
                              className="form-control"
                              style={{ fontSize: "0.8rem", marginBottom: 4 }}
                              value={ch.telegramMode || "USER_LINKED"}
                              onChange={(e) =>
                                setMode(
                                  ev.eventType,
                                  audienceFocus,
                                  e.target.value as TelegramRouteMode,
                                )
                              }
                            >
                              {(Object.keys(MODE_LABELS) as TelegramRouteMode[]).map(
                                (m) => (
                                  <option key={m} value={m}>
                                    {MODE_LABELS[m]}
                                  </option>
                                ),
                              )}
                            </select>
                            {(ch.telegramMode === "TARGETS" ||
                              ch.telegramMode === "BOTH") && (
                              <div className="tiny" style={{ maxHeight: 90, overflow: "auto" }}>
                                {targets.length === 0 ? (
                                  <span className="muted">
                                    Sin destinos (Config → Telegram)
                                  </span>
                                ) : (
                                  targets.map((t) => (
                                    <label
                                      key={t.id}
                                      className="row"
                                      style={{ gap: 4, marginBottom: 2 }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(ch.telegramTargetIds || []).includes(
                                          t.id,
                                        )}
                                        onChange={() =>
                                          toggleTarget(
                                            ev.eventType,
                                            audienceFocus,
                                            t.id,
                                          )
                                        }
                                      />
                                      {t.label}
                                      {t.isDefaultOps ? " ★" : ""}
                                    </label>
                                  ))
                                )}
                                <div className="muted" style={{ marginTop: 2 }}>
                                  Vacío = default ops / legacy
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="tiny muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details style={{ marginTop: "1.25rem" }}>
        <summary className="small" style={{ cursor: "pointer" }}>
          Vista completa (todas las audiencias)
        </summary>
        <div className="card" style={{ marginTop: 8 }}>
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="data" style={{ minWidth: 900, fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th>Evento</th>
                  {audiences.map((a) => (
                    <th key={a.code} colSpan={4} style={{ textAlign: "center" }}>
                      {a.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th />
                  {audiences.map((a) =>
                    channels.map((c) => (
                      <th key={`${a.code}-${c}`} className="tiny" style={{ textAlign: "center" }}>
                        {c.slice(0, 1).toUpperCase()}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.eventType}>
                    <td className="tiny">{ev.label}</td>
                    {audiences.map((a) => {
                      const ch = matrix[ev.eventType]?.[a.code] || emptyCh();
                      return channels.map((c) => (
                        <td key={`${a.code}-${c}`} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(ch[c])}
                            onChange={() => toggle(ev.eventType, a.code, c)}
                          />
                        </td>
                      ));
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ padding: 8 }}>
            E = email · T = telegram · I = in-app · P = push. Rutas Telegram se editan
            en la vista por audiencia ADMIN.
          </p>
        </div>
      </details>
    </div>
  );
}
