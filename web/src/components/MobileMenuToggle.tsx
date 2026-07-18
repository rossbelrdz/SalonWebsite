"use client";

/** Botón ☰ compartido (público, admin, empleado). */
export function MobileMenuToggle({
  open,
  onClick,
  className = "",
  controlsId = "mobile-nav-drawer",
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
  controlsId?: string;
}) {
  return (
    <button
      type="button"
      className={`mobile-menu-btn ${className}`.trim()}
      aria-label={open ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onClick}
    >
      <span className={`hamburger ${open ? "is-open" : ""}`} aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
