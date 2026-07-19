import { NextResponse } from "next/server";
import { TelegramTargetKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant } from "@/lib/auth";

function parseKind(v: unknown): TelegramTargetKind {
  if (v === "CHANNEL") return TelegramTargetKind.CHANNEL;
  return TelegramTargetKind.GROUP;
}

export async function GET() {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const targets = await prisma.telegramTarget.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ isDefaultOps: "desc" }, { label: "asc" }],
    });
    return NextResponse.json({
      targets,
      legacyAdminChatId: tenant.settings?.telegramAdminChatId ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();

    // DELETE via body action (single route)
    if (body.action === "delete" && body.id) {
      await prisma.telegramTarget.deleteMany({
        where: { id: String(body.id), tenantId: tenant.id },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    if (body.action === "update" && body.id) {
      const data: Record<string, unknown> = {};
      if (body.label !== undefined) data.label = String(body.label).trim();
      if (body.kind !== undefined) data.kind = parseKind(body.kind);
      if (body.chatId !== undefined) data.chatId = String(body.chatId).trim();
      if (body.messageThreadId !== undefined) {
        const n = body.messageThreadId === "" || body.messageThreadId == null
          ? null
          : Number(body.messageThreadId);
        data.messageThreadId =
          n != null && Number.isFinite(n) ? Math.trunc(n) : null;
      }
      if (body.active !== undefined) data.active = Boolean(body.active);
      if (body.isDefaultOps !== undefined) {
        data.isDefaultOps = Boolean(body.isDefaultOps);
      }

      const updated = await prisma.telegramTarget.updateMany({
        where: { id: String(body.id), tenantId: tenant.id },
        data,
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Destino no encontrado" }, { status: 404 });
      }
      const target = await prisma.telegramTarget.findUnique({
        where: { id: String(body.id) },
      });
      return NextResponse.json({ ok: true, target });
    }

    // Create
    const label = String(body.label || "").trim();
    const chatId = String(body.chatId || "").trim();
    if (!label || !chatId) {
      return NextResponse.json(
        { error: "label y chatId son requeridos" },
        { status: 400 },
      );
    }
    const threadRaw = body.messageThreadId;
    const messageThreadId =
      threadRaw === "" || threadRaw == null
        ? null
        : Number.isFinite(Number(threadRaw))
          ? Math.trunc(Number(threadRaw))
          : null;

    const target = await prisma.telegramTarget.create({
      data: {
        tenantId: tenant.id,
        label,
        kind: parseKind(body.kind),
        chatId,
        messageThreadId,
        active: body.active === undefined ? true : Boolean(body.active),
        isDefaultOps: Boolean(body.isDefaultOps),
      },
    });
    return NextResponse.json({ ok: true, target });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  // Alias: reusa POST con action update
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if (body.label !== undefined) data.label = String(body.label).trim();
    if (body.kind !== undefined) data.kind = parseKind(body.kind);
    if (body.chatId !== undefined) data.chatId = String(body.chatId).trim();
    if (body.messageThreadId !== undefined) {
      const n =
        body.messageThreadId === "" || body.messageThreadId == null
          ? null
          : Number(body.messageThreadId);
      data.messageThreadId =
        n != null && Number.isFinite(n) ? Math.trunc(n) : null;
    }
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.isDefaultOps !== undefined) {
      data.isDefaultOps = Boolean(body.isDefaultOps);
    }
    const updated = await prisma.telegramTarget.updateMany({
      where: { id: String(body.id), tenantId: tenant.id },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Destino no encontrado" }, { status: 404 });
    }
    const target = await prisma.telegramTarget.findUnique({
      where: { id: String(body.id) },
    });
    return NextResponse.json({ ok: true, target });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    await prisma.telegramTarget.deleteMany({
      where: { id, tenantId: tenant.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
