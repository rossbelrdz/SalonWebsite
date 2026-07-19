import { NextResponse } from "next/server";
import type { TelegramRouteMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultTenant } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac/permissions";
import {
  NOTIF_AUDIENCES,
  NOTIF_AUDIENCE_LABELS,
  NOTIF_EVENT_CATALOG,
  emptyChannels,
} from "@/lib/rbac/catalog";
import { ensureTenantMatrices } from "@/lib/rbac/seed-matrices";
import { clearNotificationMatrixCache } from "@/lib/rbac/notification-matrix";

function asRouteMode(v: unknown): TelegramRouteMode {
  if (v === "TARGETS" || v === "BOTH" || v === "USER_LINKED") return v;
  return "USER_LINKED";
}

export async function GET() {
  try {
    await requirePermission("tenant.notifications.matrix");
    const tenant = await getDefaultTenant();
    await ensureTenantMatrices(prisma, tenant.id);

    const rows = await prisma.notificationMatrixRule.findMany({
      where: { tenantId: tenant.id },
    });

    const matrix: Record<
      string,
      Record<
        string,
        {
          email: boolean;
          telegram: boolean;
          inApp: boolean;
          push: boolean;
          telegramMode: TelegramRouteMode;
          telegramTargetIds: string[];
        }
      >
    > = {};
    for (const ev of NOTIF_EVENT_CATALOG) {
      matrix[ev.eventType] = {};
      for (const a of NOTIF_AUDIENCES) {
        matrix[ev.eventType][a] = emptyChannels();
      }
    }
    for (const r of rows) {
      if (!matrix[r.eventType]) matrix[r.eventType] = {};
      matrix[r.eventType][r.audience] = {
        email: r.email,
        telegram: r.telegram,
        inApp: r.inApp,
        push: r.push,
        telegramMode: asRouteMode(r.telegramMode),
        telegramTargetIds: Array.isArray(r.telegramTargetIds)
          ? r.telegramTargetIds
          : [],
      };
    }

    const targets = await prisma.telegramTarget.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: [{ isDefaultOps: "desc" }, { label: "asc" }],
      select: {
        id: true,
        label: true,
        kind: true,
        chatId: true,
        isDefaultOps: true,
      },
    });

    return NextResponse.json({
      events: NOTIF_EVENT_CATALOG,
      audiences: NOTIF_AUDIENCES.map((a) => ({
        code: a,
        label: NOTIF_AUDIENCE_LABELS[a],
      })),
      channels: ["email", "telegram", "inApp", "push"],
      telegramModes: ["USER_LINKED", "TARGETS", "BOTH"],
      matrix,
      targets,
      tenantId: tenant.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requirePermission("tenant.notifications.matrix");
    const tenant = await getDefaultTenant();
    const body = await req.json();

    if (body.reset) {
      await ensureTenantMatrices(prisma, tenant.id, { reset: true });
      clearNotificationMatrixCache(tenant.id);
      return NextResponse.json({ ok: true, reset: true });
    }

    // updates: [{ eventType, audience, email, telegram, inApp, push, telegramMode?, telegramTargetIds? }]
    const updates = Array.isArray(body.updates) ? body.updates : [];
    for (const u of updates) {
      const eventType = String(u.eventType);
      const audience = String(u.audience);
      if (!NOTIF_EVENT_CATALOG.some((e) => e.eventType === eventType)) continue;
      if (!NOTIF_AUDIENCES.includes(audience as (typeof NOTIF_AUDIENCES)[number])) {
        continue;
      }

      const telegramMode = asRouteMode(u.telegramMode);
      const telegramTargetIds = Array.isArray(u.telegramTargetIds)
        ? u.telegramTargetIds.map(String).filter(Boolean)
        : [];

      await prisma.notificationMatrixRule.upsert({
        where: {
          tenantId_eventType_audience: {
            tenantId: tenant.id,
            eventType,
            audience,
          },
        },
        update: {
          email: Boolean(u.email),
          telegram: Boolean(u.telegram),
          inApp: Boolean(u.inApp),
          push: Boolean(u.push),
          telegramMode,
          telegramTargetIds,
        },
        create: {
          tenantId: tenant.id,
          eventType,
          audience,
          email: Boolean(u.email),
          telegram: Boolean(u.telegram),
          inApp: Boolean(u.inApp),
          push: Boolean(u.push),
          telegramMode,
          telegramTargetIds,
        },
      });
    }

    clearNotificationMatrixCache(tenant.id);
    return NextResponse.json({ ok: true, count: updates.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
