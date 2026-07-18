"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

type Account = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyTelegram: boolean;
  notifyInApp: boolean;
  mfaEnabled: boolean;
  telegramChatId: string | null;
  passkeys: { id: string; nickname: string | null; createdAt: string }[];
  pushCount: number;
  hasPushConfigured: boolean;
  vapidPublicKey: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function AccountClient() {
  const [acc, setAcc] = useState<Account | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/account");
    const data = await res.json();
    if (res.ok) setAcc(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(section: string, payload: Record<string, unknown>) {
    setMsg("");
    setErr("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error");
      return;
    }
    setMsg("Guardado");
    load();
  }

  async function enablePush() {
    setErr("");
    setMsg("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Este navegador no soporta push");
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permiso de notificaciones denegado");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(acc!.vapidPublicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al suscribir");
      setMsg("Push activado en este dispositivo");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error push");
    }
  }

  async function setupMfa() {
    setErr("");
    const res = await fetch("/api/mfa/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error MFA");
      return;
    }
    setMfaQr(data.qrDataUrl);
    setMfaSecret(data.secret);
  }

  async function confirmMfa() {
    const res = await fetch("/api/mfa/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: mfaCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Código inválido");
      return;
    }
    setMsg("MFA activado");
    setMfaQr("");
    setMfaCode("");
    load();
  }

  async function disableMfa() {
    await fetch("/api/mfa/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable" }),
    });
    setMsg("MFA desactivado");
    load();
  }

  async function addPasskey() {
    setErr("");
    try {
      if (!browserSupportsWebAuthn()) {
        throw new Error("Passkeys no soportadas en este navegador");
      }
      const optRes = await fetch("/api/passkey/register");
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || "Error options");
      const att = await startRegistration({ optionsJSON: options });
      const res = await fetch("/api/passkey/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: att, nickname: "Mi passkey" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");
      setMsg("Passkey registrada");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error passkey");
    }
  }

  if (!acc) {
    return <p className="muted">Cargando…</p>;
  }

  return (
    <div className="stack">
      {msg && <div className="flash flash-ok">{msg}</div>}
      {err && <div className="flash flash-error">{err}</div>}

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Datos personales</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              patch("profile", {
                name: fd.get("name"),
                email: fd.get("email"),
                phone: fd.get("phone"),
              });
            }}
          >
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input name="name" className="form-control" defaultValue={acc.name} required />
            </div>
            <div className="form-group">
              <label className="form-label">Correo</label>
              <input
                name="email"
                type="email"
                className="form-control"
                defaultValue={acc.email || ""}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              <input name="phone" className="form-control" defaultValue={acc.phone || ""} />
            </div>
            <p className="tiny muted">ID de usuario (Telegram /start): <code>{acc.id}</code></p>
            <button type="submit" className="btn btn-primary btn-sm">
              Guardar datos
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Contraseña</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              patch("password", {
                currentPassword: fd.get("currentPassword"),
                newPassword: fd.get("newPassword"),
              });
              e.currentTarget.reset();
            }}
          >
            <div className="form-group">
              <label className="form-label">Actual</label>
              <input name="currentPassword" type="password" className="form-control" required />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva</label>
              <input name="newPassword" type="password" className="form-control" minLength={6} required />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Cambiar contraseña
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Notificaciones</h3>
          <p className="small muted">Activa o desactiva cada canal.</p>
          {(
            [
              ["notifyEmail", "Correo (Resend)", acc.notifyEmail],
              ["notifyPush", "Push del navegador / PWA", acc.notifyPush],
              ["notifyTelegram", "Telegram", acc.notifyTelegram],
              ["notifyInApp", "Campanita in-app", acc.notifyInApp],
            ] as const
          ).map(([key, label, val]) => (
            <label key={key} className="row" style={{ marginBottom: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => patch("notifications", { [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-accent btn-sm"
              disabled={!acc.hasPushConfigured}
              onClick={enablePush}
            >
              Activar push en este dispositivo
            </button>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Suscripciones push: {acc.pushCount}
              {acc.telegramChatId ? ` · Telegram vinculado (${acc.telegramChatId})` : " · Telegram no vinculado"}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Seguridad — MFA (TOTP)</h3>
          <p className="small muted">
            Opcional. Usa Google Authenticator, 1Password, etc.
          </p>
          {acc.mfaEnabled ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={disableMfa}>
              Desactivar MFA
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={setupMfa}>
                Configurar MFA
              </button>
              {mfaQr && (
                <div style={{ marginTop: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mfaQr} alt="QR MFA" width={180} height={180} />
                  <p className="tiny muted">Secret: {mfaSecret}</p>
                  <div className="form-group">
                    <label className="form-label">Código de 6 dígitos</label>
                    <input
                      className="form-control"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={confirmMfa}>
                    Confirmar y activar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Passkeys</h3>
          <p className="small muted">
            Inicio de sesión con huella, Face ID o llave de seguridad.
          </p>
          <ul className="small">
            {acc.passkeys.map((p) => (
              <li key={p.id}>{p.nickname || "Passkey"} — {new Date(p.createdAt).toLocaleDateString("es-MX")}</li>
            ))}
            {acc.passkeys.length === 0 && <li className="muted">Ninguna aún</li>}
          </ul>
          <button type="button" className="btn btn-primary btn-sm" onClick={addPasskey}>
            Agregar passkey
          </button>
        </div>
      </div>
    </div>
  );
}
