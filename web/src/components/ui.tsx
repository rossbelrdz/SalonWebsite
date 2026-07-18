import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="card-body">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header" style={{ marginBottom: "1.25rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>{title}</h1>
          {subtitle && (
            <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-body text-center" style={{ padding: "2.5rem 1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>{title}</h3>
        {description && <p className="muted">{description}</p>}
        {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
      </div>
    </div>
  );
}

export function Alert({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "success" | "danger" | "warning";
}) {
  const bg =
    variant === "success"
      ? "var(--success-soft)"
      : variant === "danger"
        ? "var(--danger-soft)"
        : variant === "warning"
          ? "var(--warning-soft)"
          : "var(--secondary-soft)";
  return (
    <div
      style={{
        background: bg,
        borderRadius: "var(--radius)",
        padding: "0.85rem 1rem",
        marginBottom: "1rem",
        fontSize: "0.9rem",
      }}
    >
      {children}
    </div>
  );
}
