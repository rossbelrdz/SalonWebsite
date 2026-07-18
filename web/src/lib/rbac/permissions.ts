import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";
import { ensureTenantMatrices } from "./seed-matrices";
import type { RoleCode } from "./catalog";

function roleCodeFromSession(session: SessionPayload): RoleCode {
  if (session.isSuperAdmin) return "SUPER_ADMIN";
  if (session.role === Role.ADMIN) return "ADMIN";
  if (session.role === Role.EMPLOYEE) return "EMPLOYEE";
  return "CLIENT";
}

const cache = new Map<string, { at: number; map: Map<string, boolean> }>();
const TTL = 30_000;

async function loadRoleMap(tenantId: string, roleCode: string) {
  const key = `${tenantId}:${roleCode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.map;

  let rows = await prisma.rolePermission.findMany({
    where: { tenantId, roleCode },
  });

  if (rows.length === 0) {
    await ensureTenantMatrices(prisma, tenantId);
    rows = await prisma.rolePermission.findMany({
      where: { tenantId, roleCode },
    });
  }

  const map = new Map(rows.map((r) => [r.permissionKey, r.allowed]));
  cache.set(key, { at: Date.now(), map });
  return map;
}

export function clearPermissionCache(tenantId?: string) {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}

/**
 * Super Admin de plataforma: SIEMPRE tiene todos los permisos.
 * No depende de la matriz ni de tenantId en sesión.
 */
export async function can(
  session: SessionPayload | null | undefined,
  permissionKey: string,
  tenantId?: string | null,
): Promise<boolean> {
  if (!session?.userId) return false;

  // Superadmin = bypass total (reglas de producto)
  if (session.isSuperAdmin) return true;

  const tid = tenantId || session.tenantId;
  if (!tid) return false;

  const roleCode = roleCodeFromSession(session);
  const map = await loadRoleMap(tid, roleCode);

  if (map.has(permissionKey)) {
    return Boolean(map.get(permissionKey));
  }
  return false;
}

export async function requirePermission(
  permissionKey: string,
  tenantId?: string | null,
): Promise<SessionPayload> {
  const { requireSession } = await import("@/lib/auth");
  const session = await requireSession();
  const ok = await can(session, permissionKey, tenantId ?? session.tenantId);
  if (!ok) throw new Error("FORBIDDEN");
  return session;
}

export async function listPermissionsForSession(
  session: SessionPayload,
  tenantId: string,
) {
  if (session.isSuperAdmin) {
    const { PERMISSION_CATALOG } = await import("./catalog");
    return {
      roleCode: "SUPER_ADMIN" as RoleCode,
      permissions: PERMISSION_CATALOG.map((p) => p.key),
    };
  }
  const roleCode = roleCodeFromSession(session);
  const map = await loadRoleMap(tenantId, roleCode);
  const keys: string[] = [];
  for (const [k, v] of map) if (v) keys.push(k);
  return { roleCode, permissions: keys };
}
