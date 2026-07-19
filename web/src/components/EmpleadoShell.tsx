"use client";

/**
 * Shell C — área empleado (sidebar reducido + topbar).
 * Contrato: docs/patterns/app-shells.md + mockup/empleado/*
 * Mismo esqueleto CSS que admin; NO PublicNav. F8: checador/comisiones van aquí.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

const links = [
  { href: "/empleado", label: "Agenda hoy", section: "Mi día" },
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

  let lastSection = "";

  return (
    <div className={`admin-shell ${open ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <aside className="sidebar" id="empleado-sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">S</span>
          <span>Empleado</span>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Empleado">
          {links.map((l) => {
            const showSection = Boolean(l.section && l.section !== lastSection);
            if (l.section) lastSection = l.section;
            const base = l.href.split("#")[0];
            const active =
              base === "/empleado"
                ? pathname === "/empleado" && !l.href.includes("#")
                : pathname.startsWith(base);
            return (
              <div key={l.href}>
                {showSection && <div className="sidebar-section">{l.section}</div>}
                <Link
                  href={l.href}
                  className={active ? "is-active" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {showAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              Vista admin
            </Link>
          )}
          <Link href="/cuenta" onClick={() => setOpen(false)}>
            Mi cuenta
          </Link>
          <Link href="/" onClick={() => setOpen(false)}>
            Sitio público
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-ghost btn-sm" style={{ width: "100%" }}>
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
              onClick={() => setOpen(true)}
              controlsId="empleado-sidebar"
            />
            <div>
              <strong>Mi agenda</strong>
              <div className="tiny muted">{userName}</div>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NotificationBell href="/cuenta" />
            <span className="badge badge-info">Empleado</span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
