export type NotifyChannel = "EMAIL" | "TELEGRAM" | "IN_APP" | "PUSH";

export type NotifyPriority = "high" | "normal" | "low";

export type NotificationJobData = {
  logId: string;
  eventKey: string;
  eventType: string;
  tenantId: string;
  channel: NotifyChannel;
  recipient: string;
  subject?: string;
  text: string;
  html?: string;
  userId?: string | null;
};

export type EventType =
  | "account.created"
  | "appointment.created"
  | "appointment.prepaid"
  | "appointment.cancelled"
  | "appointment.reassignment"
  | "appointment.reassignment_accepted"
  | "appointment.rescheduled"
  | "appointment.reminder_24h"
  | "appointment.reminder_2h"
  | "payment.refunded"
  | "absence.requested"
  | "absence.resolved";

export const QUEUE_NAME = "salon-notifications";
