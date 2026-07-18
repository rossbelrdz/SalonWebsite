import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    if (!name || !address || !city) {
      return NextResponse.json({ error: "Nombre, dirección y ciudad requeridos" }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name,
        address,
        city,
        phone: body.phone || null,
        openTime: body.openTime || "09:00",
        closeTime: body.closeTime || "19:00",
        lat: body.lat ? Number(body.lat) : null,
        lng: body.lng ? Number(body.lng) : null,
      },
    });
    return NextResponse.json({ ok: true, id: branch.id });
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
    const existing = await prisma.branch.findFirst({ where: { id, tenantId: tenant.id } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.branch.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        address: body.address !== undefined ? String(body.address).trim() : undefined,
        city: body.city !== undefined ? String(body.city).trim() : undefined,
        phone: body.phone !== undefined ? body.phone || null : undefined,
        openTime: body.openTime !== undefined ? body.openTime : undefined,
        closeTime: body.closeTime !== undefined ? body.closeTime : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
