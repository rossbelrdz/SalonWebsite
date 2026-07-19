"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function LoginClient({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaPending, setMfaPending] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || mfaPending) return;

    let cancelled = false;

    function mount() {
      if (cancelled || !widgetRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      widgetRef.current.innerHTML = "";
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey!,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }

    const existing = document.querySelector(
      'script[data-turnstile="1"]',
    ) as HTMLScriptElement | null;
    if (existing && window.turnstile) {
      mount();
    } else if (!existing) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.dataset.turnstile = "1";
      s.onload = () => mount();
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", mount);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [turnstileSiteKey, mode, mfaPending]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* ignore */
      }
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      if (mode === "login") {
        if (mfaPending) {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mfaPending, mfaToken }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error MFA");
          router.push(data.redirect || "/");
          router.refresh();
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: fd.get("identifier"),
            password: fd.get("password"),
            turnstileToken: turnstileToken || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          resetTurnstile();
          throw new Error(data.error || "Error");
        }
        if (data.mfaRequired) {
          setMfaPending(data.mfaPending);
          return;
        }
        router.push(data.redirect || "/");
        router.refresh();
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            email: fd.get("email") || null,
            phone: fd.get("phone") || null,
            password: fd.get("password"),
            turnstileToken: turnstileToken || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          resetTurnstile();
          throw new Error(data.error || "Error");
        }
        router.push(data.redirect || "/mis-citas");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPasskey() {
    setError("");
    setLoading(true);
    try {
      if (!browserSupportsWebAuthn()) {
        throw new Error("Passkeys no soportadas");
      }
      const email = (
        document.querySelector<HTMLInputElement>('input[name="identifier"]')
          ?.value || ""
      ).trim();
      const q = email ? `?email=${encodeURIComponent(email)}` : "";
      const optRes = await fetch(`/api/passkey/authenticate${q}`);
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || "Error passkey");
      const assertion = await startAuthentication({ optionsJSON: options });
      const res = await fetch("/api/passkey/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: assertion,
          challenge: options.challenge,
          userId: options.userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Passkey falló");
      router.push(data.redirect || "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error passkey");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="card-body">
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="small muted">
            Registro mínimo: nombre + correo o celular
          </p>

          <div className="row" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className={`btn btn-sm ${mode === "login" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setMode("login");
                setMfaPending("");
                setTurnstileToken("");
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === "register" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setMode("register");
                setMfaPending("");
                setTurnstileToken("");
              }}
            >
              Registrarme
            </button>
          </div>

          {error && <div className="flash flash-error">{error}</div>}

          <form onSubmit={onSubmit}>
            {mode === "register" && (
              <>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input name="name" className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo (opcional si hay celular)</label>
                  <input name="email" type="email" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Celular (opcional si hay correo)</label>
                  <input name="phone" className="form-control" />
                </div>
              </>
            )}
            {mode === "login" && !mfaPending && (
              <div className="form-group">
                <label className="form-label">Correo o celular</label>
                <input name="identifier" className="form-control" required />
              </div>
            )}
            {mode === "login" && mfaPending ? (
              <div className="form-group">
                <label className="form-label">Código MFA (6 dígitos)</label>
                <input
                  className="form-control"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  className="form-control"
                  required={!mfaPending && mode === "login" ? true : mode === "register"}
                  minLength={6}
                  disabled={!!mfaPending}
                />
              </div>
            )}

            {turnstileSiteKey && !mfaPending && (
              <div className="form-group">
                <div ref={widgetRef} />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading
                ? "…"
                : mfaPending
                  ? "Verificar MFA"
                  : mode === "login"
                    ? "Entrar"
                    : "Crear cuenta"}
            </button>
          </form>

          {mode === "login" && !mfaPending && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
              disabled={loading}
              onClick={loginWithPasskey}
            >
              Entrar con Passkey
            </button>
          )}

          <p className="tiny muted" style={{ marginTop: "1.25rem" }}>
            Demo: <code>admin@salon.local</code> / <code>demo1234</code>
            <br />
            Cliente: <code>cliente@salon.local</code> / <code>demo1234</code>
            <br />
            Al registrarte se encola un correo de bienvenida (si Resend está configurado).
          </p>
          <p className="small" style={{ marginTop: "0.75rem" }}>
            <Link href="/">← Inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
