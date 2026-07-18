import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, getDefaultTenant } from "@/lib/auth";

/** Log de notificaciones del tenant (auditoría admin). */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const tenant = await getDefaultTenant();
    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit") || 50));

    const items = await prisma.notificationLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
