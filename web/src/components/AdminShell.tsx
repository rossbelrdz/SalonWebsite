"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

const baseLinks = [
  { href: "/admin", label: "Dashboard", section: "Operación" },
  { href: "/admin/citas", label: "Citas" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/sucursales", label: "Sucursales" },
  { href: "/admin/personal", label: "Personal", section: "Personas" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/notificaciones", label: "Log notificaciones", section: "Sistema" },
  { href: "/admin/permisos", label: "Matriz permisos" },
  { href: "/admin/matriz-notificaciones", label: "Matriz notificaciones" },
  { href: "/admin/config", label: "Configuración" },
];

export function AdminShell({
  isSuperAdmin = false,
  userName,
  children,
}: {
  isSuperAdmin?: boolean;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cerrar menú al navegar (móvil)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Evitar scroll del fondo con drawer abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape cierra el menú
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = isSuperAdmin
    ? [
        ...baseLinks,
        { href: "/admin/plataforma", label: "Plataforma", section: "Sistema" },
      ]
    : baseLinks;

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

      <aside className="sidebar" id="admin-sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">S</span>
          <span>Salon Admin</span>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => {
            const showSection = Boolean(l.section && l.section !== lastSection);
            if (l.section) lastSection = l.section;
            const active =
              l.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(l.href);
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
          <Link href="/empleado" onClick={() => setOpen(false)}>
            Vista empleado
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
              controlsId="admin-sidebar"
            />
            <div>
              <strong>Panel admin</strong>
              <div className="tiny muted">{userName}</div>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NotificationBell href="/cuenta" />
            <Link href="/cuenta" className="btn btn-ghost btn-sm admin-topbar-cuenta">
              Cuenta
            </Link>
            <span className="badge badge-accent">
              {isSuperAdmin ? "Super" : "Admin"}
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
