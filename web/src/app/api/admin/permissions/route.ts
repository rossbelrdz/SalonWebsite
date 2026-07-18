import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { requirePermission, clearPermissionCache } from "@/lib/rbac/permissions";
import {
  PERMISSION_CATALOG,
  ROLE_CODES,
  ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  type RoleCode,
} from "@/lib/rbac/catalog";
import { ensureTenantMatrices } from "@/lib/rbac/seed-matrices";

export async function GET() {
  try {
    const session = await requirePermission("tenant.permissions.edit");
    const tenant = await getDefaultTenant();
    await ensureTenantMatrices(prisma, tenant.id);

    const rows = await prisma.rolePermission.findMany({
      where: { tenantId: tenant.id },
    });

    const matrix: Record<string, Record<string, boolean>> = {};
    for (const role of ROLE_CODES) {
      matrix[role] = {};
      for (const p of PERMISSION_CATALOG) {
        matrix[role][p.key] = false;
      }
    }
    for (const r of rows) {
      if (!matrix[r.roleCode]) matrix[r.roleCode] = {};
      matrix[r.roleCode][r.permissionKey] = r.allowed;
    }

    return NextResponse.json({
      roles: ROLE_CODES.map((c) => ({ code: c, label: ROLE_LABELS[c] })),
      permissions: PERMISSION_CATALOG,
      matrix,
      tenantId: tenant.id,
      editor: session.userId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requirePermission("tenant.permissions.edit");
    const tenant = await getDefaultTenant();
    const body = await req.json();

    if (body.reset) {
      await ensureTenantMatrices(prisma, tenant.id, { reset: true });
      clearPermissionCache(tenant.id);
      return NextResponse.json({ ok: true, reset: true });
    }

    // body.updates: [{ roleCode, permissionKey, allowed }]
    // SUPER_ADMIN no se puede modificar desde admin (siempre all-access en runtime)
    const updates = Array.isArray(body.updates) ? body.updates : [];
    let applied = 0;
    for (const u of updates) {
      const roleCode = String(u.roleCode);
      const permissionKey = String(u.permissionKey);
      if (roleCode === "SUPER_ADMIN") continue;
      if (!ROLE_CODES.includes(roleCode as RoleCode)) continue;
      if (!PERMISSION_CATALOG.some((p) => p.key === permissionKey)) continue;

      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleCode_permissionKey: {
            tenantId: tenant.id,
            roleCode,
            permissionKey,
          },
        },
        update: { allowed: Boolean(u.allowed) },
        create: {
          tenantId: tenant.id,
          roleCode,
          permissionKey,
          allowed: Boolean(u.allowed),
        },
      });
      applied++;
    }

    // Asegurar que SUPER_ADMIN quede siempre en true en DB (por si hubo datos viejos)
    for (const perm of PERMISSION_CATALOG) {
      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleCode_permissionKey: {
            tenantId: tenant.id,
            roleCode: "SUPER_ADMIN",
            permissionKey: perm.key,
          },
        },
        update: { allowed: true },
        create: {
          tenantId: tenant.id,
          roleCode: "SUPER_ADMIN",
          permissionKey: perm.key,
          allowed: true,
        },
      });
    }

    clearPermissionCache(tenant.id);
    return NextResponse.json({ ok: true, count: applied });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** Solo para seed defaults reference (sin auth en GET de defaults). */
export async function POST(req: Request) {
  try {
    await requirePermission("tenant.permissions.edit");
    const tenant = await getDefaultTenant();
    const body = await req.json();
    if (body.action === "seed_defaults") {
      await ensureTenantMatrices(prisma, tenant.id, { reset: true });
      clearPermissionCache(tenant.id);
      return NextResponse.json({
        ok: true,
        defaults: DEFAULT_PERMISSIONS,
      });
    }
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
