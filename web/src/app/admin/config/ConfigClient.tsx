"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserForm } from "./UserForm";

type Initial = {
  businessName: string;
  themePrimary: string;
  themeAccent: string;
  timezone: string;
  currency: string;
  prepaidDiscountPct: number;
  minLeadMinutes: number;
  maxLeadDays: number;
  refundFullHours: number;
  refundPartialPct: number;
  refundNoneHours: number;
  resendFromEmail: string;
  resendFromName: string;
  hasResendKey: boolean;
  telegramEnabled: boolean;
  hasTelegramToken: boolean;
  telegramAdminChatId: string;
  turnstileSiteKey: string;
  hasTurnstileSecret: boolean;
  activeProvider: string;
  mpPublicKey: string;
  hasMpToken: boolean;
  paypalClientId: string;
  paypalSandbox: boolean;
  hasPaypalSecret: boolean;
  hasClipKey: boolean;
  hasClipSecret: boolean;
};

type Member = {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  active: boolean;
};

type TgTarget = {
  id: string;
  label: string;
  kind: string;
  chatId: string;
  messageThreadId: number | null;
  active: boolean;
  isDefaultOps: boolean;
};

const TABS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Apariencia" },
  { id: "pagos", label: "Pagos" },
  { id: "correo", label: "Correo" },
  { id: "telegram", label: "Telegram" },
  { id: "turnstile", label: "Turnstile" },
  { id: "usuarios", label: "Usuarios" },
  { id: "citas", label: "Citas / prepago" },
] as const;

export function ConfigClient({
  initial,
  members,
}: {
  initial: Initial;
  members: Member[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("general");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [primary, setPrimary] = useState(initial.themePrimary);
  const [accent, setAccent] = useState(initial.themeAccent);
  const [tgTargets, setTgTargets] = useState<TgTarget[]>([]);
  const [tgLoading, setTgLoading] = useState(false);

  const loadTgTargets = useCallback(async () => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/admin/telegram-targets");
      const data = await res.json();
      if (res.ok) setTgTargets(data.targets || []);
    } catch {
      /* ignore */
    } finally {
      setTgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "telegram") void loadTgTargets();
  }, [tab, loadTgTargets]);

  async function save(section: string, payload: Record<string, unknown>) {
    setMsg("");
    setErr("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error al guardar");
      return;
    }
    setMsg("Guardado");
    router.refresh();
  }

  async function addTgTarget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setErr("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/telegram-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: fd.get("label"),
        kind: fd.get("kind"),
        chatId: fd.get("chatId"),
        messageThreadId: fd.get("messageThreadId") || null,
        isDefaultOps: fd.get("isDefaultOps") === "on",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error al crear destino");
      return;
    }
    e.currentTarget.reset();
    setMsg("Destino Telegram creado");
    void loadTgTargets();
  }

  async function deleteTgTarget(id: string) {
    if (!confirm("¿Eliminar este destino?")) return;
    setErr("");
    const res = await fetch(`/api/admin/telegram-targets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error al eliminar");
      return;
    }
    setMsg("Destino eliminado");
    void loadTgTargets();
  }

  return (
    <div>
      <div className="tabs" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setTab(t.id);
              setMsg("");
              setErr("");
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="flash flash-ok">{msg}</div>}
      {err && <div className="flash flash-error">{err}</div>}

      {tab === "general" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save("general", {
                  businessName: fd.get("businessName"),
                  timezone: fd.get("timezone"),
                  currency: fd.get("currency"),
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">Nombre comercial</label>
                <input
                  name="businessName"
                  className="form-control"
                  defaultValue={initial.businessName}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Zona horaria</label>
                <input
                  name="timezone"
                  className="form-control"
                  defaultValue={initial.timezone}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <input
                  name="currency"
                  className="form-control"
                  defaultValue={initial.currency}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Colores de marca</h3>
            <p className="small muted">
              Se aplican al sitio público y al admin del tenant (CSS variables).
            </p>
            <div className="form-group">
              <label className="form-label">Color primario</label>
              <div className="color-row">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                />
                <input
                  className="form-control"
                  style={{ maxWidth: 140 }}
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color acento</label>
              <div className="color-row">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                />
                <input
                  className="form-control"
                  style={{ maxWidth: 140 }}
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                />
              </div>
            </div>
            <div className="row" style={{ margin: "1rem 0" }}>
              <button type="button" className="btn btn-primary" style={{ background: primary }}>
                Primary
              </button>
              <button type="button" className="btn btn-accent" style={{ background: accent }}>
                Accent
              </button>
              <span className="badge" style={{ background: primary + "22", color: primary }}>
                Badge
              </span>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => save("appearance", { themePrimary: primary, themeAccent: accent })}
              >
                Guardar colores
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPrimary("#1f4d3a");
                  setAccent("#e36f4a");
                  save("appearance", { reset: true });
                }}
              >
                Restaurar defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "correo" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save("correo", {
                  resendFromEmail: fd.get("resendFromEmail"),
                  resendFromName: fd.get("resendFromName"),
                  resendApiKey: fd.get("resendApiKey") || undefined,
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">From email</label>
                <input
                  name="resendFromEmail"
                  className="form-control"
                  defaultValue={initial.resendFromEmail}
                />
              </div>
              <div className="form-group">
                <label className="form-label">From name</label>
                <input
                  name="resendFromName"
                  className="form-control"
                  defaultValue={initial.resendFromName}
                />
              </div>
              <div className="form-group">
                <label className="form-label">API Key Resend</label>
                <input
                  name="resendApiKey"
                  type="password"
                  className="form-control form-control-secret"
                  placeholder={initial.hasResendKey ? "•••• (dejar vacío para no cambiar)" : "re_…"}
                />
                <p className="form-hint">
                  Cifrado en reposo. Los envíos van por BullMQ (worker). Dominio
                  verificado en Resend.
                </p>
              </div>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "telegram" && (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card" style={{ maxWidth: 520 }}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Bot</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  save("telegram", {
                    telegramEnabled: fd.get("telegramEnabled") === "on",
                    telegramBotToken: fd.get("telegramBotToken") || undefined,
                    telegramAdminChatId: fd.get("telegramAdminChatId"),
                  });
                }}
              >
                <label className="row" style={{ marginBottom: "1rem" }}>
                  <input
                    type="checkbox"
                    name="telegramEnabled"
                    defaultChecked={initial.telegramEnabled}
                  />
                  Bot activo
                </label>
                <div className="form-group">
                  <label className="form-label">Bot token</label>
                  <input
                    name="telegramBotToken"
                    type="password"
                    className="form-control form-control-secret"
                    placeholder={
                      initial.hasTelegramToken
                        ? "•••• (dejar vacío para no cambiar)"
                        : "token de @BotFather"
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Chat ID admin (legacy / fallback)
                  </label>
                  <input
                    name="telegramAdminChatId"
                    className="form-control"
                    defaultValue={initial.telegramAdminChatId}
                    placeholder="ej. -100123… o 123456789"
                  />
                  <p className="form-hint">
                    Fallback si no hay destinos activos o default ops. Preferí el
                    catálogo de destinos abajo. Webhook:{" "}
                    <code>/api/telegram/webhook</code>. Usuarios:{" "}
                    <code>/start &lt;userId&gt;</code>.
                  </p>
                </div>
                <button type="submit" className="btn btn-primary">
                  Guardar bot
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Destinos (grupos / canales)</h3>
              <p className="small muted">
                Usados por la matriz en modo TARGETS/BOTH (avisos operativos).
              </p>
              {tgLoading ? (
                <p className="muted small">Cargando…</p>
              ) : tgTargets.length === 0 ? (
                <p className="small muted">Sin destinos aún.</p>
              ) : (
                <div className="table-wrap" style={{ marginBottom: "1rem" }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Tipo</th>
                        <th>Chat</th>
                        <th>Ops</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {tgTargets.map((t) => (
                        <tr key={t.id}>
                          <td>
                            {t.label}
                            {t.messageThreadId != null && (
                              <div className="tiny muted">
                                thread {t.messageThreadId}
                              </div>
                            )}
                          </td>
                          <td className="small">{t.kind}</td>
                          <td className="tiny">
                            <code>{t.chatId}</code>
                          </td>
                          <td className="small">
                            {t.isDefaultOps ? "default" : "—"}
                            {!t.active && " (off)"}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => deleteTgTarget(t.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={addTgTarget}>
                <div className="form-group">
                  <label className="form-label">Etiqueta</label>
                  <input name="label" className="form-control" required placeholder="Ops principal" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select name="kind" className="form-control" defaultValue="GROUP">
                    <option value="GROUP">Grupo</option>
                    <option value="CHANNEL">Canal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chat ID</label>
                  <input name="chatId" className="form-control" required placeholder="-100…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Thread ID (topic, opcional)</label>
                  <input name="messageThreadId" className="form-control" inputMode="numeric" />
                </div>
                <label className="row" style={{ marginBottom: "1rem" }}>
                  <input type="checkbox" name="isDefaultOps" />
                  Default operativo (matriz sin IDs)
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  Agregar destino
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === "turnstile" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save("turnstile", {
                  turnstileSiteKey: fd.get("turnstileSiteKey"),
                  turnstileSecret: fd.get("turnstileSecret") || undefined,
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">Site key</label>
                <input
                  name="turnstileSiteKey"
                  className="form-control"
                  defaultValue={initial.turnstileSiteKey}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Secret key</label>
                <input
                  name="turnstileSecret"
                  type="password"
                  className="form-control form-control-secret"
                  placeholder={
                    initial.hasTurnstileSecret
                      ? "•••• (dejar vacío para no cambiar)"
                      : "secret"
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Alta de usuario</h3>
              <UserForm />
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.userId}>
                      <td>
                        {m.name}
                        <div className="tiny muted">{m.email || m.phone}</div>
                      </td>
                      <td>{m.role}</td>
                      <td>{m.active ? "Activo" : "Baja"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={async () => {
                            await fetch("/api/admin/users", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                userId: m.userId,
                                active: !m.active,
                              }),
                            });
                            router.refresh();
                          }}
                        >
                          {m.active ? "Dar de baja" : "Reactivar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "pagos" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-body">
            <p className="small muted">
              Proveedor activo (superadmin):{" "}
              <strong>{initial.activeProvider || "NONE"}</strong>. Aquí configuras
              las credenciales del negocio para esa pasarela.
            </p>

            {(initial.activeProvider === "MERCADOPAGO" ||
              initial.activeProvider === "NONE") && (
              <form
                style={{ marginBottom: "1.5rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  save("pagos_mp", {
                    mpPublicKey: fd.get("mpPublicKey"),
                    mpAccessToken: fd.get("mpAccessToken") || undefined,
                  });
                }}
              >
                <h3 style={{ fontSize: "1rem" }}>Mercado Pago</h3>
                <div className="form-group">
                  <label className="form-label">Public Key</label>
                  <input
                    name="mpPublicKey"
                    className="form-control"
                    defaultValue={initial.mpPublicKey}
                    placeholder="APP_USR-…"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Access Token {initial.hasMpToken ? "(guardado ••••)" : ""}
                  </label>
                  <input
                    name="mpAccessToken"
                    type="password"
                    className="form-control"
                    placeholder={initial.hasMpToken ? "Dejar vacío para no cambiar" : "TEST-… o APP_USR-…"}
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Mercado Pago
                </button>
              </form>
            )}

            {(initial.activeProvider === "PAYPAL" ||
              initial.activeProvider === "NONE") && (
              <form
                style={{ marginBottom: "1.5rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  save("pagos_paypal", {
                    paypalClientId: fd.get("paypalClientId"),
                    paypalClientSecret: fd.get("paypalClientSecret") || undefined,
                    paypalSandbox: fd.get("paypalSandbox") === "on",
                  });
                }}
              >
                <h3 style={{ fontSize: "1rem" }}>PayPal</h3>
                <div className="form-group">
                  <label className="form-label">Client ID</label>
                  <input
                    name="paypalClientId"
                    className="form-control"
                    defaultValue={initial.paypalClientId}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Client Secret {initial.hasPaypalSecret ? "(guardado ••••)" : ""}
                  </label>
                  <input
                    name="paypalClientSecret"
                    type="password"
                    className="form-control"
                    placeholder={
                      initial.hasPaypalSecret ? "Dejar vacío para no cambiar" : ""
                    }
                    autoComplete="off"
                  />
                </div>
                <label className="row" style={{ marginBottom: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="paypalSandbox"
                    defaultChecked={initial.paypalSandbox}
                  />
                  <span>Modo sandbox</span>
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar PayPal
                </button>
              </form>
            )}

            {(initial.activeProvider === "CLIP" ||
              initial.activeProvider === "NONE") && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  save("pagos_clip", {
                    clipApiKey: fd.get("clipApiKey") || undefined,
                    clipApiSecret: fd.get("clipApiSecret") || undefined,
                  });
                }}
              >
                <h3 style={{ fontSize: "1rem" }}>Clip.mx</h3>
                <p className="tiny muted">
                  Checkout redireccionado: API Key + Secret → Basic auth (
                  <code>api.payclip.com/v2/checkout</code>).
                </p>
                <div className="form-group">
                  <label className="form-label">
                    API Key {initial.hasClipKey ? "(guardada ••••)" : ""}
                  </label>
                  <input
                    name="clipApiKey"
                    type="password"
                    className="form-control"
                    placeholder={initial.hasClipKey ? "Dejar vacío para no cambiar" : ""}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    API Secret {initial.hasClipSecret ? "(guardada ••••)" : ""}
                  </label>
                  <input
                    name="clipApiSecret"
                    type="password"
                    className="form-control"
                    placeholder={
                      initial.hasClipSecret ? "Dejar vacío para no cambiar" : ""
                    }
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Clip
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {tab === "citas" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save("citas", {
                  prepaidDiscountPct: Number(fd.get("prepaidDiscountPct")),
                  minLeadMinutes: Number(fd.get("minLeadMinutes")),
                  maxLeadDays: Number(fd.get("maxLeadDays")),
                  refundFullHours: Number(fd.get("refundFullHours")),
                  refundPartialPct: Number(fd.get("refundPartialPct")),
                  refundNoneHours: Number(fd.get("refundNoneHours")),
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">% descuento prepago</label>
                <input
                  name="prepaidDiscountPct"
                  type="number"
                  className="form-control"
                  defaultValue={initial.prepaidDiscountPct}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Antelación mínima (minutos)</label>
                <input
                  name="minLeadMinutes"
                  type="number"
                  className="form-control"
                  defaultValue={initial.minLeadMinutes}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Antelación máxima (días)</label>
                <input
                  name="maxLeadDays"
                  type="number"
                  className="form-control"
                  defaultValue={initial.maxLeadDays}
                />
              </div>
              <hr style={{ margin: "1rem 0", border: 0, borderTop: "1px solid var(--border)" }} />
              <h3 style={{ fontSize: "1rem" }}>Política de reembolso</h3>
              <div className="form-group">
                <label className="form-label">Reembolso 100% si cancela con ≥ (horas)</label>
                <input
                  name="refundFullHours"
                  type="number"
                  className="form-control"
                  defaultValue={initial.refundFullHours}
                />
              </div>
              <div className="form-group">
                <label className="form-label">% reembolso parcial (ventana intermedia)</label>
                <input
                  name="refundPartialPct"
                  type="number"
                  className="form-control"
                  defaultValue={initial.refundPartialPct}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sin reembolso si faltan menos de (horas)</label>
                <input
                  name="refundNoneHours"
                  type="number"
                  className="form-control"
                  defaultValue={initial.refundNoneHours}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
