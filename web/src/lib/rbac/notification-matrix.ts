import type { TelegramRouteMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureTenantMatrices } from "./seed-matrices";
import {
  DEFAULT_NOTIFICATION_MATRIX,
  emptyChannels,
  type ChannelFlags,
  type NotifAudience,
} from "./catalog";

const cache = new Map<string, { at: number; rules: Map<string, ChannelFlags> }>();
const TTL = 30_000;

function ruleKey(eventType: string, audience: string) {
  return `${eventType}::${audience}`;
}

function asRouteMode(v: string | TelegramRouteMode | null | undefined): ChannelFlags["telegramMode"] {
  if (v === "TARGETS" || v === "BOTH" || v === "USER_LINKED") return v;
  return "USER_LINKED";
}

export function clearNotificationMatrixCache(tenantId?: string) {
  if (!tenantId) {
    cache.clear();
    return;
  }
  cache.delete(tenantId);
}

async function loadMatrix(tenantId: string) {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL) return hit.rules;

  let rows = await prisma.notificationMatrixRule.findMany({ where: { tenantId } });
  if (rows.length === 0) {
    await ensureTenantMatrices(prisma, tenantId);
    rows = await prisma.notificationMatrixRule.findMany({ where: { tenantId } });
  }

  const rules = new Map<string, ChannelFlags>();
  for (const r of rows) {
    rules.set(ruleKey(r.eventType, r.audience), {
      email: r.email,
      telegram: r.telegram,
      inApp: r.inApp,
      push: r.push,
      telegramMode: asRouteMode(r.telegramMode),
      telegramTargetIds: Array.isArray(r.telegramTargetIds) ? r.telegramTargetIds : [],
    });
  }
  cache.set(tenantId, { at: Date.now(), rules });
  return rules;
}

export async function getMatrixChannels(
  tenantId: string,
  eventType: string,
  audience: NotifAudience,
): Promise<ChannelFlags> {
  const rules = await loadMatrix(tenantId);
  const found = rules.get(ruleKey(eventType, audience));
  if (found) return found;

  const def =
    DEFAULT_NOTIFICATION_MATRIX[eventType]?.[audience] || emptyChannels();
  return def;
}

/** Intersección: matriz tenant ∩ preferencias usuario (si hay). Conserva mode/targets. */
export function applyUserPrefs(
  matrix: ChannelFlags,
  user?: {
    notifyEmail?: boolean;
    notifyTelegram?: boolean;
    notifyInApp?: boolean;
    notifyPush?: boolean;
  } | null,
): ChannelFlags {
  if (!user) return matrix;
  return {
    email: matrix.email && user.notifyEmail !== false,
    telegram: matrix.telegram && user.notifyTelegram !== false,
    inApp: matrix.inApp && user.notifyInApp !== false,
    push: matrix.push && user.notifyPush !== false,
    telegramMode: matrix.telegramMode,
    telegramTargetIds: matrix.telegramTargetIds,
  };
}
