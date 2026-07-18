import { NotificationChannel, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enqueueNotification } from "./queue";
import type { EventType } from "./types";
import {
  applyUserPrefs,
  getMatrixChannels,
} from "@/lib/rbac/notification-matrix";
import type { NotifAudience } from "@/lib/rbac/catalog";
import {
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

async function tenantAdmins(tenantId: string) {
  return prisma.membership.findMany({
    where: { tenantId, role: Role.ADMIN, active: true },
    include: { user: true },
  });
}

async function settings(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } });
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
  /** Chat admin del tenant (no es user chat). */
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

  const tgChat =
    opts.telegramChatId ||
    (opts.audience === "ADMIN" ? opts.adminTelegramChatId : null);
  if (ch.telegram && opts.telegramEnabled && tgChat) {
    await enqueueNotification({
      tenantId: opts.tenantId,
      eventKey: `${opts.eventType}:${opts.entityId}:telegram:${opts.tag}`,
      eventType: opts.eventType,
      channel: NotificationChannel.TELEGRAM,
      recipient: tgChat,
      text:
        opts.audience === "ADMIN"
          ? `${opts.content.subject}\n\n${opts.content.text}`
          : opts.content.text,
      userId: opts.userId,
      priority: prio,
    });
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
  // Si no hay admins pero sí chat operativo, respeta matriz ADMIN telegram
  if (admins.length === 0 && s?.telegramAdminChatId) {
    await dispatchChannels({
      tenantId,
      audience: "ADMIN",
      eventType,
      entityId,
      tag: "admin:chat",
      content,
      adminTelegramChatId: s.telegramAdminChatId,
      telegramEnabled: s.telegramEnabled,
    });
  }
}

function apptCtx(a: {
  id: string;
  clientName: string;
  clientEmail?: string | null;
  clientUserId?: string | null;
  startsAt: Date;
  priceCents: number;
  prepaid?: boolean;
  service: { name: string };
  branch: { name: string };
  employee: { id: string; user: { name: string } };
  proposedEmployee?: { user: { name: string } } | null;
  reassignmentNote?: string | null;
}): AppointmentContext {
  return {
    appointmentId: a.id,
    clientName: a.clientName,
    serviceName: a.service.name,
    branchName: a.branch.name,
    employeeName: a.employee.user.name,
    startsAt: a.startsAt,
    priceCents: a.priceCents,
    prepaid: a.prepaid,
    proposedEmployeeName: a.proposedEmployee?.user.name,
    note: a.reassignmentNote,
  };
}

export async function notifyAccountCreated(opts: {
  tenantId: string;
  userId: string;
  name: string;
  email?: string | null;
}) {
  const content = tplAccountCreated(opts.name, opts.email);
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });
  if (!a) return;
  const ctx = apptCtx(a);
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });
  if (!a) return;
  const ctx = apptCtx({ ...a, prepaid: true });
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });
  if (!a) return;
  const ctx = { ...apptCtx(a), refundCents };
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
      proposedEmployee: { include: { user: true } },
    },
  });
  if (!a) return;
  const ctx = apptCtx(a);
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });
  if (!a) return;
  const ctx = apptCtx(a);
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
    include: {
      service: true,
      branch: true,
      employee: { include: { user: true } },
    },
  });
  if (!a) return;
  const eventType: EventType =
    kind === "24h" ? "appointment.reminder_24h" : "appointment.reminder_2h";
  const content = tplReminder(apptCtx(a), kind === "24h" ? "en ~24 h" : "en ~2 h");
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
  for (const a of admins) {
    if (a.user.email) {
      await enqueueNotification({
        tenantId: ab.tenantId,
        eventKey: `absence.requested:${absenceId}:email:admin:${a.userId}`,
        eventType: "absence.requested",
        channel: NotificationChannel.EMAIL,
        recipient: a.user.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
        userId: a.userId,
        priority: ab.blockedByPrepaid ? "high" : "normal",
      });
    }
    await enqueueNotification({
      tenantId: ab.tenantId,
      eventKey: `absence.requested:${absenceId}:in_app:admin:${a.userId}`,
      eventType: "absence.requested",
      channel: NotificationChannel.IN_APP,
      recipient: a.userId,
      subject: content.subject,
      text: content.text,
      userId: a.userId,
    });
  }
  const s = await settings(ab.tenantId);
  if (s?.telegramEnabled && s.telegramAdminChatId) {
    await enqueueNotification({
      tenantId: ab.tenantId,
      eventKey: `absence.requested:${absenceId}:telegram:admin`,
      eventType: "absence.requested",
      channel: NotificationChannel.TELEGRAM,
      recipient: s.telegramAdminChatId,
      text: content.text,
      priority: "high",
    });
  }
}
