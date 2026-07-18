"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type Perm = { key: string; label: string; group: string };
type Role = { code: string; label: string };

function GroupRows({
  group,
  perms,
  roles,
  matrix,
  toggle,
}: {
  group: string;
  perms: Perm[];
  roles: Role[];
  matrix: Record<string, Record<string, boolean>>;
  toggle: (role: string, key: string) => void;
}) {
  return (
    <Fragment>
      <tr>
        <td
          colSpan={roles.length + 1}
          style={{
            background: "var(--surface-2, #f3efe6)",
            fontWeight: 600,
          }}
        >
          {group}
        </td>
      </tr>
      {perms.map((p) => (
        <tr key={p.key}>
          <td>
            <div className="small">{p.label}</div>
            <div className="tiny muted">{p.key}</div>
          </td>
          {roles.map((r) => {
            const locked = r.code === "SUPER_ADMIN";
            return (
              <td key={r.code} style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={locked ? true : Boolean(matrix[r.code]?.[p.key])}
                  disabled={locked}
                  title={
                    locked
                      ? "Super Admin siempre tiene todos los permisos"
                      : undefined
                  }
                  onChange={() => {
                    if (!locked) toggle(r.code, p.key);
                  }}
                  aria-label={`${r.label} ${p.key}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </Fragment>
  );
}

export function PermissionsMatrixClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [dirty, setDirty] = useState<
    { roleCode: string; permissionKey: string; allowed: boolean }[]
  >([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/permissions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sin permiso");
      setRoles(data.roles);
      setPermissions(data.permissions);
      setMatrix(data.matrix);
      setDirty([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const g = new Map<string, Perm[]>();
    for (const p of permissions) {
      if (
        filter &&
        !p.label.toLowerCase().includes(filter.toLowerCase()) &&
        !p.key.toLowerCase().includes(filter.toLowerCase())
      ) {
        continue;
      }
      if (!g.has(p.group)) g.set(p.group, []);
      g.get(p.group)!.push(p);
    }
    return g;
  }, [permissions, filter]);

  function toggle(roleCode: string, permissionKey: string) {
    if (roleCode === "SUPER_ADMIN") return; // no editable
    const next = !matrix[roleCode]?.[permissionKey];
    setMatrix((m) => ({
      ...m,
      [roleCode]: { ...m[roleCode], [permissionKey]: next },
    }));
    setDirty((d) => {
      const rest = d.filter(
        (x) => !(x.roleCode === roleCode && x.permissionKey === permissionKey),
      );
      return [...rest, { roleCode, permissionKey, allowed: next }];
    });
  }

  async function save() {
    setMsg("");
    setErr("");
    const res = await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: dirty }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error al guardar");
      return;
    }
    setMsg(`Guardado (${dirty.length} cambios)`);
    setDirty([]);
  }

  async function resetDefaults() {
    if (!confirm("¿Restaurar defaults de producto? Se pierden overrides.")) return;
    setErr("");
    const res = await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Error");
      return;
    }
    setMsg("Defaults restaurados");
    load();
  }

  if (loading) return <p className="muted">Cargando matriz…</p>;
  if (err && permissions.length === 0) {
    return <div className="flash flash-error">{err}</div>;
  }

  return (
    <div>
      {msg && <div className="flash flash-ok">{msg}</div>}
      {err && <div className="flash flash-error">{err}</div>}

      <div className="row" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <input
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Filtrar permiso…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={dirty.length === 0}
          onClick={save}
        >
          Guardar cambios ({dirty.length})
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={resetDefaults}>
          Restaurar defaults
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
          Recargar
        </button>
      </div>

      <div className="card">
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="data" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Permiso</th>
                {roles.map((r) => (
                  <th key={r.code} className="tiny" style={{ textAlign: "center" }}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...groups.entries()].map(([group, perms]) => (
                <GroupRows
                  key={group}
                  group={group}
                  perms={perms}
                  roles={roles}
                  matrix={matrix}
                  toggle={toggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        <strong>Super Admin</strong> siempre tiene todos los permisos (columna bloqueada; no se
        puede quitar). Los cambios de otros roles aplican de inmediato en API (caché ~30s).
      </p>
    </div>
  );
}
