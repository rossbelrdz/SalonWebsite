"use client";

/**
 * Shell A — sitio público (top nav).
 * Contrato: docs/patterns/app-shells.md + docs/patterns/public-nav.md
 *
 * Dos contextos de menú (no un cajón multi-rol con todo):
 *  - Sitio: solo links del salón + puerta a sesión (Entrar / Mi cuenta).
 *  - Cuenta: Mis citas · Cuenta · Volver al sitio · Salir (+ puertas admin/empleado).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

export type PublicNavSession = {
  name: string;
  role?: string | null;
  isSuperAdmin: boolean;
} | null;

/** Solo navegación del salón (visitante). Nunca admin/empleado aquí. */
const SITE_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/sucursales", label: "Sucursales" },
  { href: "/agendar", label: "Agendar" },
  { href: "/contacto", label: "Contacto" },
];

/** Área personal del cliente (misma shell, menú distinto). */
const ACCOUNT_LINKS = [
  { href: "/mis-citas", label: "Mis citas" },
  { href: "/cuenta", label: "Mi cuenta" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAccountArea(pathname: string) {
  return (
    pathname === "/cuenta" ||
    pathname.startsWith("/cuenta/") ||
    pathname === "/mis-citas" ||
    pathname.startsWith("/mis-citas/")
  );
}

export function PublicNavClient({
  session,
  brand = "Salon",
}: {
  session: PublicNavSession;
  brand?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const accountMode = Boolean(session) && isAccountArea(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const canAdmin = Boolean(session?.isSuperAdmin || session?.role === "ADMIN");
  const canEmployee = Boolean(
    session?.role === "EMPLOYEE" || session?.isSuperAdmin || session?.role === "ADMIN",
  );

  return (
    <header className={`public-nav ${open ? "is-open" : ""} ${accountMode ? "is-account" : ""}`}>
      <div className="inner">
        <Link href={accountMode ? "/cuenta" : "/"} className="logo" onClick={close}>
          <span className="logo-mark">S</span>
          {accountMode ? "Mi espacio" : brand}
        </Link>

        {/* Desktop: un solo contexto a la vez */}
        <nav
          className="nav-links nav-links-desktop"
          aria-label={accountMode ? "Mi cuenta" : "Sitio público"}
        >
          {accountMode
            ? ACCOUNT_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive(pathname, l.href) ? "is-active" : undefined}
                >
                  {l.label}
                </Link>
              ))
            : SITE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive(pathname, l.href) ? "is-active" : undefined}
                >
                  {l.label}
                </Link>
              ))}
        </nav>

        <div className="nav-actions">
          <div className="nav-actions-desktop">
            {accountMode ? (
              <>
                {session && <NotificationBell href="/cuenta" />}
                <Link href="/" className="btn btn-ghost btn-sm">
                  Sitio
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Salir
                  </button>
                </form>
              </>
            ) : session ? (
              <>
                <NotificationBell href="/cuenta" />
                <Link href="/cuenta" className="btn btn-ghost btn-sm">
                  Mi cuenta
                </Link>
                <Link href="/agendar" className="btn btn-accent btn-sm">
                  Agendar
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Entrar
                </Link>
                <Link href="/agendar" className="btn btn-accent btn-sm">
                  Agendar
                </Link>
              </>
            )}
          </div>

          <div className="nav-actions-mobile">
            {session && <NotificationBell href="/cuenta" />}
            <MobileMenuToggle open={open} onClick={() => setOpen((v) => !v)} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={close}
      />

      <div
        className="mobile-nav-drawer"
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={accountMode ? "Menú de mi cuenta" : "Menú del sitio"}
      >
        <div className="mobile-nav-drawer-head">
          <strong>{accountMode ? "Mi cuenta" : "Menú"}</strong>
          {session && <span className="tiny muted">{session.name}</span>}
          <button type="button" className="mobile-nav-close" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        {accountMode ? (
          <nav className="mobile-nav-list" aria-label="Mi cuenta">
            {ACCOUNT_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isActive(pathname, l.href) ? "is-active" : undefined}
                onClick={close}
              >
                {l.label}
              </Link>
            ))}

            <p className="mobile-nav-section">Sitio</p>
            <Link href="/" onClick={close}>
              Volver al sitio
            </Link>
            <Link href="/agendar" onClick={close}>
              Agendar cita
            </Link>

            {(canAdmin || canEmployee) && (
              <>
                <p className="mobile-nav-section">Paneles</p>
                {canAdmin && (
                  <Link href="/admin" className="mobile-nav-area-link" onClick={close}>
                    Panel admin
                  </Link>
                )}
                {canEmployee && (
                  <Link href="/empleado" className="mobile-nav-area-link" onClick={close}>
                    Mi agenda (empleado)
                  </Link>
                )}
              </>
            )}

            <form action="/api/auth/logout" method="post" className="mobile-nav-logout">
              <button type="submit" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                Cerrar sesión
              </button>
            </form>
          </nav>
        ) : (
          <nav className="mobile-nav-list" aria-label="Sitio público">
            {SITE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isActive(pathname, l.href) ? "is-active" : undefined}
                onClick={close}
              >
                {l.label}
              </Link>
            ))}

            {session ? (
              <>
                <p className="mobile-nav-section">Sesión</p>
                <Link
                  href="/cuenta"
                  className="mobile-nav-area-link"
                  onClick={close}
                  style={{ marginTop: 0, borderTop: "none", paddingTop: "0.75rem" }}
                >
                  Ir a mi cuenta
                </Link>
              </>
            ) : (
              <>
                <p className="mobile-nav-section">Acceso</p>
                <Link href="/login" onClick={close}>
                  Entrar
                </Link>
                <Link href="/agendar" className="mobile-nav-area-link" onClick={close}>
                  Agendar cita
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
