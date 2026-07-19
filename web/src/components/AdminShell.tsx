"use client";

/**
 * Shell B — panel admin (sidebar + topbar).
 * Contrato: docs/patterns/app-shells.md + docs/patterns/admin-sidebar.md
 * NO PublicNav. Móvil = este sidebar en drawer (solo operación admin).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

type NavLink = { href: string; label: string; section?: string };

/** Solo operación del negocio — no sitio público ni menú de cuenta. */
const OP_LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", section: "Operación" },
  { href: "/admin/citas", label: "Citas" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/sucursales", label: "Sucursales" },
  { href: "/admin/personal", label: "Personal", section: "Personas" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/asistencia", label: "Asistencia" },
  { href: "/admin/comisiones", label: "Comisiones" },
  { href: "/admin/reportes", label: "Reportes", section: "Análisis" },
];

const SYSTEM_LINKS: NavLink[] = [
  { href: "/admin/config", label: "Configuración", section: "Sistema" },
  { href: "/admin/notificaciones", label: "Log notificaciones" },
  { href: "/admin/permisos", label: "Matriz permisos" },
  { href: "/admin/matriz-notificaciones", label: "Matriz notificaciones" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavBlock({
  links,
  pathname,
  onNavigate,
}: {
  links: NavLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  let lastSection = "";
  return (
    <>
      {links.map((l) => {
        const showSection = Boolean(l.section && l.section !== lastSection);
        if (l.section) lastSection = l.section;
        return (
          <div key={l.href}>
            {showSection && <div className="sidebar-section">{l.section}</div>}
            <Link
              href={l.href}
              className={isActive(pathname, l.href) ? "is-active" : undefined}
              onClick={onNavigate}
            >
              {l.label}
            </Link>
          </div>
        );
      })}
    </>
  );
}

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
  /** Solo en viewport drawer (≤900px) el sidebar puede estar “cerrado”. */
  const [isMobileNav, setIsMobileNav] = useState(false);

  const systemLinks: NavLink[] = isSuperAdmin
    ? [...SYSTEM_LINKS, { href: "/admin/plataforma", label: "Plataforma" }]
    : SYSTEM_LINKS;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      setIsMobileNav(mq.matches);
      if (!mq.matches) setOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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
  /** En desktop el sidebar siempre es usable; en móvil solo si está abierto. */
  const drawerClosed = isMobileNav && !open;

  return (
    <div className={`admin-shell ${open ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className={`sidebar-backdrop${open ? " is-open" : ""}`}
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={close}
      />

      <aside
        className={`sidebar${open ? " is-open" : ""}`}
        id="admin-sidebar"
        aria-label="Navegación admin"
        aria-hidden={drawerClosed || undefined}
        inert={drawerClosed ? true : undefined}
      >
        <div className="sidebar-brand">
          <span className="logo-mark">S</span>
          <span>Salon Admin</span>
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
          <NavBlock links={OP_LINKS} pathname={pathname} onNavigate={close} />
          <NavBlock links={systemLinks} pathname={pathname} onNavigate={close} />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-section">Otras áreas</div>
          <Link href="/empleado" onClick={close}>
            Vista empleado
          </Link>
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
              controlsId="admin-sidebar"
            />
            <div className="admin-topbar-title">
              <strong>Panel admin</strong>
              <div className="tiny muted">{userName}</div>
            </div>
          </div>
          <div className="admin-topbar-right">
            <NotificationBell href="/cuenta" />
            <span className="badge badge-accent admin-topbar-badge">
              {isSuperAdmin ? "Super" : "Admin"}
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
