import { NotificationChannel, Role, type TelegramRouteMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enqueueNotification } from "./queue";
import type { EventType } from "./types";
import {
  applyUserPrefs,
  getMatrixChannels,
} from "@/lib/rbac/notification-matrix";
import type { NotifAudience } from "@/lib/rbac/catalog";
import {
  formatCancelPolicy,
  tplAbsenceAdmin,
  tplAccountCreated,
  tplAppointmentCancelled,
  tplAppointmentCreated,
  tplAppointmentPrepaid,
  tplReassignment,
  tplRefund,
  tplReminder,
  tplStaffAppointment,
  type AppointmentContext,
} from "./templates";
import { appointmentServicesLabel } from "@/lib/appointment-services";

const APPT_NOTIFY_INCLUDE = {
  service: true,
  lines: {
    include: { service: true },
    orderBy: { sortOrder: "asc" as const },
  },
  branch: true,
  employee: { include: { user: true } },
  proposedEmployee: { include: { user: true } },
};

async function tenantAdmins(tenantId: string) {
  return prisma.membership.findMany({
    where: { tenantId, role: Role.ADMIN, active: true },
    include: { user: true },
  });
}

async function settings(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } });
}

async function tenantName(tenantId: string): Promise<string | null> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return t?.name ?? null;
}

type TgDest = {
  chatId: string;
  messageThreadId?: number | null;
  keySuffix: string;
};

/**
 * Resuelve destinos Telegram según telegramMode de la matriz.
 * TARGETS: IDs de regla → isDefaultOps → telegramAdminChatId legacy.
 */
async function resolveTelegramDestinations(opts: {
  tenantId: string;
  mode: TelegramRouteMode | string;
  targetIds: string[];
  userChatId?: string | null;
  /** Solo para USER_LINKED cuando audience es ADMIN y no hay chat de user. */
  allowUserLinkedAdminFallback?: boolean;
  adminTelegramChatId?: string | null;
  /** Preferencias: si false, no envía USER_LINKED. TARGETS ignora prefs. */
  allowUserLinked: boolean;
}): Promise<TgDest[]> {
  const mode = (opts.mode || "USER_LINKED") as TelegramRouteMode;
  const dests: TgDest[] = [];
  const seen = new Set<string>();

  const push = (d: TgDest) => {
    const k = `${d.chatId}:${d.messageThreadId ?? ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    dests.push(d);
  };

  if ((mode === "USER_LINKED" || mode === "BOTH") && opts.allowUserLinked) {
    if (opts.userChatId) {
      push({
        chatId: opts.userChatId,
        keySuffix: `user:${opts.userChatId}`,
      });
    } else if (
      opts.allowUserLinkedAdminFallback &&
      opts.adminTelegramChatId
    ) {
      push({
        chatId: opts.adminTelegramChatId,
        keySuffix: "admin:legacy-user",
      });
    }
  }

  if (mode === "TARGETS" || mode === "BOTH") {
    let targets: {
      id: string;
      chatId: string;
      messageThreadId: number | null;
    }[] = [];

    if (opts.targetIds.length > 0) {
      targets = await prisma.telegramTarget.findMany({
        where: {
          tenantId: opts.tenantId,
          id: { in: opts.targetIds },
          active: true,
        },
        select: { id: true, chatId: true, messageThreadId: true },
      });
    }
    if (targets.length === 0) {
      targets = await prisma.telegramTarget.findMany({
        where: {
          tenantId: opts.tenantId,
          isDefaultOps: true,
          active: true,
        },
        select: { id: true, chatId: true, messageThreadId: true },
      });
    }
    if (targets.length > 0) {
      for (const t of targets) {
        push({
          chatId: t.chatId,
          messageThreadId: t.messageThreadId,
          keySuffix: `target:${t.id}`,
        });
      }
    } else if (opts.adminTelegramChatId) {
      push({
        chatId: opts.adminTelegramChatId,
        keySuffix: "admin:legacy",
      });
    }
  }

  return dests;
}

async function dispatchChannels(opts: {
  tenantId: string;
  audience: NotifAudience;
  eventType: string;
  entityId: string;
  tag: string;
  content: { subject: string; text: string; html?: string };
  priority?: "high" | "normal" | "low";
  userId?: string | null;
  email?: string | null;
  telegramChatId?: string | null;
  /** Chat admin del tenant (fallback legacy). */
  adminTelegramChatId?: string | null;
  telegramEnabled?: boolean;
}) {
  const matrix = await getMatrixChannels(
    opts.tenantId,
    opts.eventType,
    opts.audience,
  );
  const user = opts.userId
    ? await prisma.user.findUnique({ where: { id: opts.userId } })
    : null;
  const ch = applyUserPrefs(matrix, user);
  const prio = opts.priority || "normal";

  if (ch.email && opts.email) {
    await enqueueNotification({
      tenantId: opts.tenantId,
      eventKey: `${opts.eventType}:${opts.entityId}:email:${opts.tag}`,
      eventType: opts.eventType,
      channel: NotificationChannel.EMAIL,
      recipient: opts.email,
      subject: opts.content.subject,
      text: opts.content.text,
      html: opts.content.html,
      userId: opts.userId,
      priority: prio,
    });
  }

  if (matrix.telegram && opts.telegramEnabled) {
    const dests = await resolveTelegramDestinations({
      tenantId: opts.tenantId,
      mode: matrix.telegramMode,
      targetIds: matrix.telegramTargetIds || [],
      userChatId: opts.telegramChatId,
      allowUserLinkedAdminFallback:
        opts.audience === "ADMIN" && matrix.telegramMode === "USER_LINKED",
      adminTelegramChatId: opts.adminTelegramChatId,
      // Preferencias solo afectan destino usuario; TARGETS siempre si matriz lo pide
      allowUserLinked: ch.telegram,
    });

    const text =
      opts.audience === "ADMIN"
        ? `${opts.content.subject}\n\n${opts.content.text}`
        : opts.content.text;

    for (const d of dests) {
      // eventKey sin tag de admin: evita N copias al mismo target al iterar admins
      await enqueueNotification({
        tenantId: opts.tenantId,
        eventKey: `${opts.eventType}:${opts.entityId}:telegram:${d.keySuffix}`,
        eventType: opts.eventType,
        channel: NotificationChannel.TELEGRAM,
        recipient: d.chatId,
        text,
        userId: opts.userId,
        priority: prio,
        messageThreadId: d.messageThreadId,
      });
    }
  }

  if (ch.inApp && opts.userId) {
    await enqueueNotification({
      tenantId: opts.tenantId,
      eventKey: `${opts.eventType}:${opts.entityId}:in_app:${opts.tag}`,
      eventType: opts.eventType,
      channel: NotificationChannel.IN_APP,
      recipient: opts.userId,
      subject: opts.content.subject,
      text: opts.content.text,
      userId: opts.userId,
      priority: prio,
    });
  }

  if (ch.push && opts.userId) {
    await enqueueNotification({
      tenantId: opts.tenantId,
      eventKey: `${opts.eventType}:${opts.entityId}:push:${opts.tag}`,
      eventType: opts.eventType,
      channel: NotificationChannel.PUSH,
      recipient: opts.userId,
      subject: opts.content.subject,
      text: opts.content.text,
      userId: opts.userId,
      priority: prio,
    });
  }
}

async function toClientChannels(
  tenantId: string,
  userId: string | null | undefined,
  email: string | null | undefined,
  eventType: EventType,
  entityId: string,
  content: { subject: string; text: string; html?: string },
  priority: "high" | "normal" | "low" = "normal",
) {
  const s = await settings(tenantId);
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;
  await dispatchChannels({
    tenantId,
    audience: "CLIENT",
    eventType,
    entityId,
    tag: "client",
    content,
    priority,
    userId: userId || user?.id,
    email: email || user?.email,
    telegramChatId: user?.telegramChatId,
    telegramEnabled: s?.telegramEnabled,
    adminTelegramChatId: s?.telegramAdminChatId,
  });
}

async function toStaff(
  tenantId: string,
  employeeId: string,
  eventType: EventType,
  entityId: string,
  content: { subject: string; text: string; html?: string },
  roleTag: string,
) {
  const emp = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!emp) return;
  const s = await settings(tenantId);
  await dispatchChannels({
    tenantId,
    audience: "EMPLOYEE",
    eventType,
    entityId,
    tag: roleTag,
    content,
    userId: emp.userId,
    email: emp.user.email,
    telegramChatId: emp.user.telegramChatId,
    telegramEnabled: s?.telegramEnabled,
    adminTelegramChatId: s?.telegramAdminChatId,
  });
}

async function toAdminsInApp(
  tenantId: string,
  eventType: EventType,
  entityId: string,
  content: { subject: string; text: string },
) {
  const admins = await tenantAdmins(tenantId);
  const s = await settings(tenantId);
  for (const a of admins) {
    await dispatchChannels({
      tenantId,
      audience: "ADMIN",
      eventType,
      entityId,
      tag: `admin:${a.userId}`,
      content,
      priority: "low",
      userId: a.userId,
      email: a.user.email,
      telegramChatId: a.user.telegramChatId,
      adminTelegramChatId: s?.telegramAdminChatId,
      telegramEnabled: s?.telegramEnabled,
    });
  }
  // Sin admins: aún puede haber TARGETS / legacy chat ops
  if (admins.length === 0) {
    await dispatchChannels({
      tenantId,
      audience: "ADMIN",
      eventType,
      entityId,
      tag: "admin:ops",
      content,
      adminTelegramChatId: s?.telegramAdminChatId,
      telegramEnabled: s?.telegramEnabled,
    });
  }
}

function apptCtx(
  a: {
    id: string;
    clientName: string;
    clientEmail?: string | null;
    clientUserId?: string | null;
    startsAt: Date;
    priceCents: number;
    prepaid?: boolean;
    service: { name: string };
    lines?: {
      sortOrder: number;
      service: { name: string };
    }[];
    branch: { name: string };
    employee: { id: string; user: { name: string } };
    proposedEmployee?: { user: { name: string } } | null;
    reassignmentNote?: string | null;
  },
  extra?: {
    tenantName?: string | null;
    cancelPolicy?: string | null;
    refundCents?: number;
  },
): AppointmentContext {
  return {
    appointmentId: a.id,
    clientName: a.clientName,
    serviceName: appointmentServicesLabel(a),
    branchName: a.branch.name,
    employeeName: a.employee.user.name,
    startsAt: a.startsAt,
    priceCents: a.priceCents,
    prepaid: a.prepaid,
    proposedEmployeeName: a.proposedEmployee?.user.name,
    note: a.reassignmentNote,
    tenantName: extra?.tenantName,
    cancelPolicy: extra?.cancelPolicy,
    refundCents: extra?.refundCents,
  };
}

async function cancelPolicyFor(tenantId: string): Promise<string | null> {
  const s = await settings(tenantId);
  if (!s) return null;
  return formatCancelPolicy({
    refundFullHours: s.refundFullHours,
    refundPartialPct: s.refundPartialPct,
    refundNoneHours: s.refundNoneHours,
  });
}

export async function notifyAccountCreated(opts: {
  tenantId: string;
  userId: string;
  name: string;
  email?: string | null;
}) {
  const name = await tenantName(opts.tenantId);
  const content = tplAccountCreated(opts.name, opts.email, name);
  // Correo de bienvenida si hay email (Resend debe estar configurado o queda SKIPPED)
  if (opts.email) {
    await enqueueNotification({
      tenantId: opts.tenantId,
      eventKey: `account.created:${opts.userId}:email:client`,
      eventType: "account.created",
      channel: NotificationChannel.EMAIL,
      recipient: opts.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      userId: opts.userId,
    });
  }
  await enqueueNotification({
    tenantId: opts.tenantId,
    eventKey: `account.created:${opts.userId}:in_app:client`,
    eventType: "account.created",
    channel: NotificationChannel.IN_APP,
    recipient: opts.userId,
    subject: content.subject,
    text: content.text,
    userId: opts.userId,
  });
}

export async function notifyAppointmentCreated(appointmentId: string) {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const name = await tenantName(a.tenantId);
  const policy = await cancelPolicyFor(a.tenantId);
  const ctx = apptCtx(a, { tenantName: name, cancelPolicy: policy });
  const content = tplAppointmentCreated(ctx);
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    "appointment.created",
    a.id,
    content,
  );
  const staff = tplStaffAppointment(
    a.employee.user.name,
    ctx,
    "Nueva cita en tu agenda",
  );
  await toStaff(a.tenantId, a.employeeId, "appointment.created", a.id, staff, "employee");
  await toAdminsInApp(a.tenantId, "appointment.created", a.id, content);
}

export async function notifyAppointmentPrepaid(appointmentId: string) {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const name = await tenantName(a.tenantId);
  const policy = await cancelPolicyFor(a.tenantId);
  const ctx = apptCtx({ ...a, prepaid: true }, {
    tenantName: name,
    cancelPolicy: policy,
  });
  const content = tplAppointmentPrepaid(ctx);
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    "appointment.prepaid",
    a.id,
    content,
    "high",
  );
  await toAdminsInApp(a.tenantId, "appointment.prepaid", a.id, content);
}

export async function notifyAppointmentCancelled(
  appointmentId: string,
  by: string,
  refundCents?: number,
) {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const name = await tenantName(a.tenantId);
  const ctx = apptCtx(a, { tenantName: name, refundCents });
  const content = tplAppointmentCancelled(ctx, by);
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    "appointment.cancelled",
    a.id,
    content,
    "high",
  );
  const staff = tplStaffAppointment(
    a.employee.user.name,
    ctx,
    "Cita cancelada",
  );
  await toStaff(a.tenantId, a.employeeId, "appointment.cancelled", a.id, staff, "employee");
  await toAdminsInApp(a.tenantId, "appointment.cancelled", a.id, content);

  if (refundCents && refundCents > 0) {
    const r = tplRefund(ctx);
    await toClientChannels(
      a.tenantId,
      a.clientUserId,
      a.clientEmail,
      "payment.refunded",
      `${a.id}-refund`,
      r,
      "high",
    );
  }
}

export async function notifyReassignment(appointmentId: string) {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const name = await tenantName(a.tenantId);
  const ctx = apptCtx(a, { tenantName: name });
  const content = tplReassignment(ctx);
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    "appointment.reassignment",
    a.id,
    content,
    "high",
  );
  if (a.proposedEmployeeId) {
    const staff = tplStaffAppointment(
      a.proposedEmployee!.user.name,
      ctx,
      "Te propusieron para una reasignación",
    );
    await toStaff(
      a.tenantId,
      a.proposedEmployeeId,
      "appointment.reassignment",
      a.id,
      staff,
      "proposed",
    );
  }
  await toAdminsInApp(a.tenantId, "appointment.reassignment", a.id, content);
}

export async function notifyReassignmentResolved(
  appointmentId: string,
  kind: "accepted" | "rescheduled" | "cancelled",
) {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const name = await tenantName(a.tenantId);
  const ctx = apptCtx(a, { tenantName: name });
  const map = {
    accepted: {
      type: "appointment.reassignment_accepted" as EventType,
      headline: "Cliente aceptó reasignación",
    },
    rescheduled: {
      type: "appointment.rescheduled" as EventType,
      headline: "Cliente reagendó la cita",
    },
    cancelled: {
      type: "appointment.cancelled" as EventType,
      headline: "Cliente canceló tras reasignación",
    },
  }[kind];
  const content = tplStaffAppointment(a.employee.user.name, ctx, map.headline);
  await toStaff(a.tenantId, a.employeeId, map.type, a.id, content, "employee");
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    map.type,
    `${a.id}-resolved`,
    {
      subject: map.headline,
      text: content.text,
      html: content.html,
    },
  );
  await toAdminsInApp(a.tenantId, map.type, a.id, content);
}

export async function notifyReminder(appointmentId: string, kind: "24h" | "2h") {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPT_NOTIFY_INCLUDE,
  });
  if (!a) return;
  const eventType: EventType =
    kind === "24h" ? "appointment.reminder_24h" : "appointment.reminder_2h";
  const name = await tenantName(a.tenantId);
  const content = tplReminder(
    apptCtx(a, { tenantName: name }),
    kind === "24h" ? "en ~24 h" : "en ~2 h",
  );
  await toClientChannels(
    a.tenantId,
    a.clientUserId,
    a.clientEmail,
    eventType,
    a.id,
    content,
    "low",
  );
}

export async function notifyAbsenceRequested(absenceId: string) {
  const ab = await prisma.absenceRequest.findUnique({
    where: { id: absenceId },
    include: { employee: { include: { user: true } } },
  });
  if (!ab) return;
  const content = tplAbsenceAdmin(
    ab.employee.user.name,
    ab.dateFrom.toISOString().slice(0, 10),
    ab.dateTo.toISOString().slice(0, 10),
    ab.blockedByPrepaid,
  );
  const admins = await tenantAdmins(ab.tenantId);
  const s = await settings(ab.tenantId);
  const prio = ab.blockedByPrepaid ? "high" : "normal";

  if (admins.length === 0) {
    await dispatchChannels({
      tenantId: ab.tenantId,
      audience: "ADMIN",
      eventType: "absence.requested",
      entityId: absenceId,
      tag: "admin:ops",
      content,
      priority: prio,
      adminTelegramChatId: s?.telegramAdminChatId,
      telegramEnabled: s?.telegramEnabled,
    });
    return;
  }

  for (const a of admins) {
    await dispatchChannels({
      tenantId: ab.tenantId,
      audience: "ADMIN",
      eventType: "absence.requested",
      entityId: absenceId,
      tag: `admin:${a.userId}`,
      content,
      priority: prio,
      userId: a.userId,
      email: a.user.email,
      telegramChatId: a.user.telegramChatId,
      adminTelegramChatId: s?.telegramAdminChatId,
      telegramEnabled: s?.telegramEnabled,
    });
  }
}
