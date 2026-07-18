import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./db";
import { readSession, type SessionPayload } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session?.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.isSuperAdmin) return session;
  if (!session.role || !roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  // Super Admin siempre entra al admin
  if (session.isSuperAdmin) return session;
  try {
    const { requirePermission } = await import("@/lib/rbac/permissions");
    return await requirePermission("admin.access");
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return requireRole([Role.ADMIN]);
    }
    throw e;
  }
}

export async function requirePermissionKey(key: string) {
  const { requirePermission } = await import("@/lib/rbac/permissions");
  return requirePermission(key);
}

/** Resolve default demo tenant (single-tenant bootstrap for F3–F5). */
export async function getDefaultTenant() {
  const slug = process.env.TENANT_SLUG || "demo";
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!tenant) {
    throw new Error("Tenant demo no encontrado. Ejecuta el seed.");
  }
  return tenant;
}

export function hasAdminAccess(session: SessionPayload | null) {
  if (!session) return false;
  // Superadmin siempre; el resto según rol (matriz se valida en APIs)
  return session.isSuperAdmin || session.role === Role.ADMIN;
}

export function hasStaffAccess(session: SessionPayload | null) {
  if (!session) return false;
  return (
    session.isSuperAdmin ||
    session.role === Role.ADMIN ||
    session.role === Role.EMPLOYEE
  );
}
