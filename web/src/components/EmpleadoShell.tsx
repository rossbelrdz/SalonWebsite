"use client";

/**
 * Shell C — área empleado (sidebar reducido + topbar).
 * Contrato: docs/patterns/app-shells.md + mockup/empleado/*
 * NO PublicNav. Solo “Mi día” + puertas a otras áreas.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

const DAY_LINKS = [
  { href: "/empleado", label: "Agenda hoy" },
  { href: "/empleado#permiso", label: "Solicitar permiso" },
];

export function EmpleadoShell({
  userName,
  showAdmin = false,
  children,
}: {
  userName: string;
  showAdmin?: boolean;
  children: React.ReactNode;
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
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={`admin-shell ${open ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={close}
      />

      <aside className="sidebar" id="empleado-sidebar" aria-label="Navegación empleado">
        <div className="sidebar-brand">
          <span className="logo-mark">S</span>
          <span>Empleado</span>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Cerrar menú"
            onClick={close}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Mi día</div>
          {DAY_LINKS.map((l) => {
            const base = l.href.split("#")[0];
            const active =
              base === "/empleado"
                ? pathname === "/empleado" && !l.href.includes("#")
                : pathname.startsWith(base);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "is-active" : undefined}
                onClick={close}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-section">Otras áreas</div>
          {showAdmin && (
            <Link href="/admin" onClick={close}>
              Panel admin
            </Link>
          )}
          <Link href="/" onClick={close}>
            Sitio público
          </Link>
          <Link href="/cuenta" onClick={close}>
            Mi cuenta
          </Link>
          <form action="/api/auth/logout" method="post" className="sidebar-logout">
            <button type="submit" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <MobileMenuToggle
              className="admin-menu-btn"
              open={open}
              onClick={() => setOpen((v) => !v)}
              controlsId="empleado-sidebar"
            />
            <div className="admin-topbar-title">
              <strong>Mi agenda</strong>
              <div className="tiny muted">{userName}</div>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NotificationBell href="/cuenta" />
            <span className="badge badge-info admin-topbar-badge">Empleado</span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
