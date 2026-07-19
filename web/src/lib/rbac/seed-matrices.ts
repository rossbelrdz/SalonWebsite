import type { PrismaClient, TelegramRouteMode } from "@prisma/client";
import {
  DEFAULT_NOTIFICATION_MATRIX,
  DEFAULT_PERMISSIONS,
  NOTIF_AUDIENCES,
  NOTIF_EVENT_CATALOG,
  PERMISSION_CATALOG,
  ROLE_CODES,
  emptyChannels,
  type RoleCode,
} from "./catalog";

function asRouteMode(v: string | undefined): TelegramRouteMode {
  if (v === "TARGETS" || v === "BOTH" || v === "USER_LINKED") return v;
  return "USER_LINKED";
}

/** Siembra o rellena huecos de permisos y notifs para un tenant (no pisa overrides existentes). */
export async function ensureTenantMatrices(
  prisma: PrismaClient,
  tenantId: string,
  opts?: { reset?: boolean },
) {
  // Prisma Client viejo (Docker sin `prisma generate`) → .rolePermission undefined
  if (!prisma.rolePermission?.upsert || !prisma.notificationMatrixRule?.upsert) {
    throw new Error(
      "Prisma Client desactualizado: faltan modelos RolePermission/NotificationMatrixRule. " +
        "Ejecuta en el contenedor: npx prisma generate && npx prisma db push",
    );
  }

  if (opts?.reset) {
    await prisma.rolePermission.deleteMany({ where: { tenantId } });
    await prisma.notificationMatrixRule.deleteMany({ where: { tenantId } });
  }

  for (const role of ROLE_CODES) {
    const allowedSet = new Set(DEFAULT_PERMISSIONS[role as RoleCode] || []);
    for (const perm of PERMISSION_CATALOG) {
      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleCode_permissionKey: {
            tenantId,
            roleCode: role,
            permissionKey: perm.key,
          },
        },
        update: opts?.reset
          ? { allowed: allowedSet.has(perm.key) }
          : {},
        create: {
          tenantId,
          roleCode: role,
          permissionKey: perm.key,
          allowed: allowedSet.has(perm.key),
        },
      });
    }
  }

  for (const ev of NOTIF_EVENT_CATALOG) {
    const byAud = DEFAULT_NOTIFICATION_MATRIX[ev.eventType] || {};
    for (const audience of NOTIF_AUDIENCES) {
      const ch = byAud[audience] || emptyChannels();
      const telegramMode = asRouteMode(ch.telegramMode);
      const telegramTargetIds = Array.isArray(ch.telegramTargetIds)
        ? ch.telegramTargetIds
        : [];
      await prisma.notificationMatrixRule.upsert({
        where: {
          tenantId_eventType_audience: {
            tenantId,
            eventType: ev.eventType,
            audience,
          },
        },
        update: opts?.reset
          ? {
              email: ch.email,
              telegram: ch.telegram,
              inApp: ch.inApp,
              push: ch.push,
              telegramMode,
              telegramTargetIds,
            }
          : {},
        create: {
          tenantId,
          eventType: ev.eventType,
          audience,
          email: ch.email,
          telegram: ch.telegram,
          inApp: ch.inApp,
          push: ch.push,
          telegramMode,
          telegramTargetIds,
        },
      });
    }
  }
}
