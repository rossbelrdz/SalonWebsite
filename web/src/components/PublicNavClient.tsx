"use client";

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

const MAIN_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/sucursales", label: "Sucursales" },
  { href: "/agendar", label: "Agendar" },
  { href: "/contacto", label: "Contacto" },
];

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

  const accountLinks = session
    ? [
        { href: "/mis-citas", label: "Mis citas" },
        { href: "/cuenta", label: "Cuenta" },
        ...(session.isSuperAdmin || session.role === "ADMIN"
          ? [{ href: "/admin", label: "Admin" }]
          : []),
        ...(session.role === "EMPLOYEE" || session.isSuperAdmin
          ? [{ href: "/empleado", label: "Empleado" }]
          : []),
      ]
    : [
        { href: "/login", label: "Entrar" },
        { href: "/agendar", label: "Agendar" },
      ];

  return (
    <header className={`public-nav ${open ? "is-open" : ""}`}>
      <div className="inner">
        <Link href="/" className="logo" onClick={close}>
          <span className="logo-mark">S</span>
          {brand}
        </Link>

        {/* Desktop: links en barra */}
        <nav className="nav-links nav-links-desktop" aria-label="Principal">
          {MAIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "is-active" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {session && (
            <span className="nav-actions-desktop">
              <NotificationBell href="/cuenta" />
            </span>
          )}
          <div className="nav-actions-desktop">
            {session ? (
              <>
                <Link href="/mis-citas" className="btn btn-secondary btn-sm">
                  Mis citas
                </Link>
                <Link href="/cuenta" className="btn btn-ghost btn-sm">
                  Cuenta
                </Link>
                {(session.isSuperAdmin || session.role === "ADMIN") && (
                  <Link href="/admin" className="btn btn-ghost btn-sm">
                    Admin
                  </Link>
                )}
                {(session.role === "EMPLOYEE" || session.isSuperAdmin) && (
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

          {/* Móvil: campanita + hamburguesa */}
          <div className="nav-actions-mobile">
            {session && <NotificationBell href="/cuenta" />}
            <MobileMenuToggle open={open} onClick={() => setOpen((v) => !v)} />
          </div>
        </div>
      </div>

      {/* Backdrop + drawer móvil */}
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
        aria-label="Menú de navegación"
      >
        <div className="mobile-nav-drawer-head">
          <strong>Menú</strong>
          {session && <span className="tiny muted">{session.name}</span>}
          <button type="button" className="mobile-nav-close" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>
        <nav className="mobile-nav-list">
          <p className="mobile-nav-section">Sitio</p>
          {MAIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "is-active" : undefined}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          <p className="mobile-nav-section">Cuenta</p>
          {accountLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href || pathname.startsWith(l.href + "/") ? "is-active" : undefined}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          {session && (
            <form action="/api/auth/logout" method="post" className="mobile-nav-logout">
              <button type="submit" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                Cerrar sesión
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
