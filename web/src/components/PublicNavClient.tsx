"use client";

/**
 * Shell A — sitio público (top nav).
 * Contrato: docs/patterns/app-shells.md + docs/patterns/public-nav.md
 * NO meter aquí el menú de operación de admin/empleado.
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

/** Links del sitio (cliente). Admin/empleado: shells B/C con sidebar. */
const PUBLIC_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/sucursales", label: "Sucursales" },
  { href: "/agendar", label: "Agendar" },
  { href: "/contacto", label: "Contacto" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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
    <header className={`public-nav ${open ? "is-open" : ""}`}>
      <div className="inner">
        <Link href="/" className="logo" onClick={close}>
          <span className="logo-mark">S</span>
          {brand}
        </Link>

        <nav className="nav-links nav-links-desktop" aria-label="Sitio público">
          {PUBLIC_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(pathname, l.href) ? "is-active" : undefined}
            >
              {l.label}
            </Link>
          ))}
          {session && (
            <Link
              href="/mis-citas"
              className={isActive(pathname, "/mis-citas") ? "is-active" : undefined}
            >
              Mis citas
            </Link>
          )}
        </nav>

        <div className="nav-actions">
          <div className="nav-actions-desktop">
            {session ? (
              <>
                <NotificationBell href="/cuenta" />
                <Link href="/cuenta" className="btn btn-ghost btn-sm">
                  Cuenta
                </Link>
                {/* Entrada a otras áreas (no menús de admin) */}
                {canAdmin && (
                  <Link href="/admin" className="btn btn-secondary btn-sm">
                    Admin
                  </Link>
                )}
                {canEmployee && !canAdmin && (
                  <Link href="/empleado" className="btn btn-secondary btn-sm">
                    Mi agenda
                  </Link>
                )}
                {canAdmin && canEmployee && (
                  <Link href="/empleado" className="btn btn-ghost btn-sm">
                    Empleado
                  </Link>
                )}
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Salir
                  </button>
                </form>
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
        aria-label="Menú del sitio"
      >
        <div className="mobile-nav-drawer-head">
          <strong>Menú</strong>
          {session && <span className="tiny muted">{session.name}</span>}
          <button type="button" className="mobile-nav-close" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>
        <nav className="mobile-nav-list" aria-label="Sitio público">
          {PUBLIC_LINKS.map((l) => (
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
              <Link
                href="/mis-citas"
                className={isActive(pathname, "/mis-citas") ? "is-active" : undefined}
                onClick={close}
              >
                Mis citas
              </Link>
              <Link
                href="/cuenta"
                className={isActive(pathname, "/cuenta") ? "is-active" : undefined}
                onClick={close}
              >
                Cuenta
              </Link>
              {canAdmin && (
                <Link href="/admin" className="mobile-nav-area-link" onClick={close}>
                  Ir al panel admin
                </Link>
              )}
              {canEmployee && (
                <Link href="/empleado" className="mobile-nav-area-link" onClick={close}>
                  Ir a mi agenda
                </Link>
              )}
              <form action="/api/auth/logout" method="post" className="mobile-nav-logout">
                <button type="submit" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" onClick={close}>
                Entrar
              </Link>
              <Link href="/agendar" onClick={close}>
                Agendar cita
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
