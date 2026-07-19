import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const branchId = searchParams.get("branchId") || "";
  const date = searchParams.get("date") || "";
  // Multi: serviceIds=a,b,c  | legacy: serviceId=a
  const multi = searchParams.get("serviceIds") || "";
  const single = searchParams.get("serviceId") || "";
  const serviceIds = multi
    ? multi.split(",").map((s) => s.trim()).filter(Boolean)
    : single
      ? [single]
      : [];

  if (!employeeId || !branchId || serviceIds.length === 0 || !date) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const slots = await getAvailableSlots({
    employeeId,
    branchId,
    serviceIds,
    date: day,
  });
  return NextResponse.json({ slots });
}
