"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";
import { NotificationBell } from "@/components/NotificationBell";

const LINKS = [
  { href: "/empleado", label: "Mi agenda" },
  { href: "/cuenta", label: "Cuenta" },
  { href: "/", label: "Sitio público" },
];

export function EmpleadoNav({
  userName,
  showAdmin,
}: {
  userName: string;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const links = showAdmin
    ? [...LINKS, { href: "/admin", label: "Admin" }]
    : LINKS;

  return (
    <header className={`public-nav ${open ? "is-open" : ""}`}>
      <div className="inner">
        <Link href="/empleado" className="logo" onClick={() => setOpen(false)}>
          <span className="logo-mark">S</span>
          Mi agenda
        </Link>

        <nav className="nav-links nav-links-desktop" aria-label="Empleado">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="nav-actions-desktop">
            <NotificationBell href="/cuenta" />
            <span className="small muted">{userName}</span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="btn btn-secondary btn-sm">
                Salir
              </button>
            </form>
          </div>
          <div className="nav-actions-mobile">
            <NotificationBell href="/cuenta" />
            <MobileMenuToggle open={open} onClick={() => setOpen((v) => !v)} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <div className="mobile-nav-drawer" id="mobile-nav-drawer" role="dialog" aria-modal="true">
        <div className="mobile-nav-drawer-head">
          <strong>Menú empleado</strong>
          <span className="tiny muted">{userName}</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <nav className="mobile-nav-list">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "is-active" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="post" className="mobile-nav-logout">
            <button type="submit" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
              Cerrar sesión
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
