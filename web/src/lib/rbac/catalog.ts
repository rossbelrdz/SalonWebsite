/** Catálogo de permisos del producto (claves estables). */

export type RoleCode = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE" | "CLIENT";

export const ROLE_CODES: RoleCode[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EMPLOYEE",
  "CLIENT",
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EMPLOYEE: "Empleado",
  CLIENT: "Cliente",
};

export type PermissionDef = {
  key: string;
  label: string;
  group: string;
};

export const PERMISSION_CATALOG: PermissionDef[] = [
  // Plataforma
  { key: "platform.tenants.list", label: "Listar todos los negocios", group: "Plataforma" },
  { key: "platform.tenants.manage", label: "Crear / suspender negocio", group: "Plataforma" },
  { key: "platform.settings", label: "Config global de plataforma", group: "Plataforma" },
  { key: "platform.matrices.edit", label: "Editar matrices globales", group: "Plataforma" },

  // Config
  { key: "tenant.config.view", label: "Ver configuración", group: "Configuración" },
  { key: "tenant.config.edit", label: "Editar configuración / secretos", group: "Configuración" },
  { key: "tenant.payments.config", label: "Configurar pagos / prepago", group: "Configuración" },
  { key: "tenant.permissions.edit", label: "Editar matriz de permisos", group: "Configuración" },
  { key: "tenant.notifications.matrix", label: "Editar matriz de notificaciones", group: "Configuración" },

  // Usuarios
  { key: "users.admin.manage", label: "Alta/baja admins", group: "Usuarios" },
  { key: "users.employee.manage", label: "Alta/baja empleados", group: "Usuarios" },
  { key: "users.client.manage", label: "Alta/baja clientes", group: "Usuarios" },
  { key: "users.roles.assign", label: "Asignar roles", group: "Usuarios" },
  { key: "users.profile.own", label: "Editar propio perfil", group: "Usuarios" },

  // Catálogo
  { key: "catalog.services.manage", label: "CRUD servicios", group: "Catálogo" },
  { key: "catalog.branches.manage", label: "CRUD sucursales", group: "Catálogo" },
  { key: "catalog.public.view", label: "Ver catálogo público", group: "Catálogo" },

  // Citas
  { key: "appointments.create.client", label: "Crear cita (cliente)", group: "Citas" },
  { key: "appointments.view.all", label: "Ver todas las citas", group: "Citas" },
  { key: "appointments.view.own.employee", label: "Ver citas propias (empleado)", group: "Citas" },
  { key: "appointments.view.own.client", label: "Ver citas propias (cliente)", group: "Citas" },
  { key: "appointments.cancel.any", label: "Cancelar cita ajena", group: "Citas" },
  { key: "appointments.cancel.own", label: "Cancelar propia cita", group: "Citas" },
  { key: "appointments.reassign", label: "Reasignar profesional", group: "Citas" },
  { key: "appointments.reassign.respond", label: "Responder reasignación", group: "Citas" },

  // Pagos
  { key: "payments.prepaid.start", label: "Iniciar prepago", group: "Pagos" },
  { key: "payments.view.tenant", label: "Ver pagos del tenant", group: "Pagos" },
  { key: "payments.refund", label: "Ejecutar reembolso", group: "Pagos" },
  { key: "payments.view.own", label: "Ver propios pagos", group: "Pagos" },

  // Personal
  { key: "staff.attendance.own", label: "Checador propio", group: "Personal" },
  { key: "staff.attendance.all", label: "Ver asistencia de todos", group: "Personal" },
  { key: "staff.absence.request", label: "Solicitar ausencia", group: "Personal" },
  { key: "staff.absence.approve", label: "Aprobar ausencia", group: "Personal" },
  { key: "staff.commissions.own", label: "Ver comisiones propias", group: "Personal" },
  { key: "staff.commissions.all", label: "Ver comisiones de todos", group: "Personal" },
  { key: "reports.tenant", label: "Reportes del tenant", group: "Personal" },

  // Admin UI sections
  { key: "admin.access", label: "Acceder al panel admin", group: "UI Admin" },
  { key: "admin.dashboard", label: "Dashboard admin", group: "UI Admin" },
  { key: "admin.notifications.log", label: "Ver log de notificaciones", group: "UI Admin" },
];

/** Defaults alineados a docs/PERMISSIONS_MATRIX.md */
export const DEFAULT_PERMISSIONS: Record<RoleCode, string[]> = {
  SUPER_ADMIN: PERMISSION_CATALOG.map((p) => p.key),
  ADMIN: [
    "tenant.config.view",
    "tenant.config.edit",
    "tenant.payments.config",
    "tenant.permissions.edit",
    "tenant.notifications.matrix",
    "users.admin.manage",
    "users.employee.manage",
    "users.client.manage",
    "users.roles.assign",
    "users.profile.own",
    "catalog.services.manage",
    "catalog.branches.manage",
    "catalog.public.view",
    "appointments.view.all",
    "appointments.view.own.employee",
    "appointments.view.own.client",
    "appointments.cancel.any",
    "appointments.cancel.own",
    "appointments.reassign",
    "payments.view.tenant",
    "payments.refund",
    "staff.attendance.own",
    "staff.attendance.all",
    "staff.absence.request",
    "staff.absence.approve",
    "staff.commissions.own",
    "staff.commissions.all",
    "reports.tenant",
    "admin.access",
    "admin.dashboard",
    "admin.notifications.log",
  ],
  EMPLOYEE: [
    "users.profile.own",
    "catalog.public.view",
    "appointments.view.own.employee",
    "appointments.cancel.own",
    "staff.attendance.own",
    "staff.absence.request",
    "staff.commissions.own",
  ],
  CLIENT: [
    "users.profile.own",
    "catalog.public.view",
    "appointments.create.client",
    "appointments.view.own.client",
    "appointments.cancel.own",
    "appointments.reassign.respond",
    "payments.prepaid.start",
    "payments.view.own",
  ],
};

export type NotifAudience = "CLIENT" | "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";

export const NOTIF_AUDIENCES: NotifAudience[] = [
  "CLIENT",
  "EMPLOYEE",
  "ADMIN",
  "SUPER_ADMIN",
];

export const NOTIF_AUDIENCE_LABELS: Record<NotifAudience, string> = {
  CLIENT: "Cliente",
  EMPLOYEE: "Empleado",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export type NotifEventDef = {
  eventType: string;
  label: string;
};

export const NOTIF_EVENT_CATALOG: NotifEventDef[] = [
  { eventType: "account.created", label: "Cuenta creada" },
  { eventType: "appointment.created", label: "Cita creada / confirmada" },
  { eventType: "appointment.prepaid", label: "Prepago exitoso" },
  { eventType: "appointment.cancelled", label: "Cita cancelada" },
  { eventType: "appointment.reassignment", label: "Reasignación propuesta" },
  { eventType: "appointment.reassignment_accepted", label: "Cliente acepta reasignación" },
  { eventType: "appointment.rescheduled", label: "Cliente reagenda" },
  { eventType: "appointment.reminder_24h", label: "Recordatorio T-24h" },
  { eventType: "appointment.reminder_2h", label: "Recordatorio T-2h" },
  { eventType: "payment.refunded", label: "Reembolso" },
  { eventType: "absence.requested", label: "Solicitud de ausencia" },
  { eventType: "absence.resolved", label: "Ausencia aprobada/rechazada" },
];

/** Alineado a Prisma enum TelegramRouteMode. */
export type TelegramRouteMode = "USER_LINKED" | "TARGETS" | "BOTH";

export type ChannelFlags = {
  email: boolean;
  telegram: boolean;
  inApp: boolean;
  push: boolean;
  telegramMode: TelegramRouteMode;
  telegramTargetIds: string[];
};

const UL = "USER_LINKED" as const;
const TG = "TARGETS" as const;

function ch(
  email: boolean,
  telegram: boolean,
  inApp: boolean,
  push: boolean,
  mode: TelegramRouteMode = UL,
): ChannelFlags {
  return {
    email,
    telegram,
    inApp,
    push,
    telegramMode: mode,
    telegramTargetIds: [],
  };
}

/** Defaults alineados a docs/NOTIFICATIONS_MATRIX.md + destinos ops. */
export const DEFAULT_NOTIFICATION_MATRIX: Record<
  string,
  Partial<Record<NotifAudience, ChannelFlags>>
> = {
  "account.created": {
    CLIENT: ch(true, false, true, false),
    EMPLOYEE: ch(true, false, true, false),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.created": {
    CLIENT: ch(true, true, true, true),
    EMPLOYEE: ch(true, true, true, true),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.prepaid": {
    CLIENT: ch(true, false, true, true),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.cancelled": {
    CLIENT: ch(true, true, true, true),
    EMPLOYEE: ch(true, false, true, true),
    ADMIN: ch(false, true, true, false, TG),
  },
  "appointment.reassignment": {
    CLIENT: ch(true, true, true, true),
    EMPLOYEE: ch(false, false, true, true),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.reassignment_accepted": {
    CLIENT: ch(true, false, true, false),
    EMPLOYEE: ch(true, false, true, true),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.rescheduled": {
    CLIENT: ch(true, false, true, false),
    EMPLOYEE: ch(true, false, true, true),
    ADMIN: ch(false, false, true, false),
  },
  "appointment.reminder_24h": {
    CLIENT: ch(true, true, false, true),
    EMPLOYEE: ch(false, false, true, false),
  },
  "appointment.reminder_2h": {
    CLIENT: ch(true, true, false, true),
    EMPLOYEE: ch(false, false, true, false),
  },
  "payment.refunded": {
    CLIENT: ch(true, false, true, true),
    ADMIN: ch(true, false, true, false),
  },
  "absence.requested": {
    EMPLOYEE: ch(false, false, true, false),
    ADMIN: ch(true, true, true, true, TG),
  },
  "absence.resolved": {
    EMPLOYEE: ch(true, false, true, true),
  },
};

export function emptyChannels(): ChannelFlags {
  return ch(false, false, false, false);
}
