import { NextResponse } from "next/server";
import { ServiceCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const durationMin = Number(body.durationMin);
    const priceCents = Math.round(Number(body.price) * 100);
    const category = (body.category as ServiceCategory) || ServiceCategory.OTHER;
    const description = String(body.description || "");
    const mediaClass = String(body.mediaClass || "media-cut");
    const imageUrlRaw = body.imageUrl != null ? String(body.imageUrl).trim() : "";
    const imageUrl = imageUrlRaw || null;

    if (!name || !durationMin || !priceCents) {
      return NextResponse.json({ error: "Nombre, duración y precio requeridos" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name,
        durationMin,
        priceCents,
        category,
        description,
        mediaClass,
        imageUrl,
      },
    });
    return NextResponse.json({ ok: true, id: service.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const id = String(body.id || "");
    const existing = await prisma.service.findFirst({ where: { id, tenantId: tenant.id } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = String(body.description);
    if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin);
    if (body.price !== undefined) data.priceCents = Math.round(Number(body.price) * 100);
    if (body.category !== undefined) data.category = body.category;
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.mediaClass !== undefined) data.mediaClass = body.mediaClass;
    if (body.imageUrl !== undefined) {
      const u = String(body.imageUrl || "").trim();
      data.imageUrl = u || null;
    }

    await prisma.service.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
