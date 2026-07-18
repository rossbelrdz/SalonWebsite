import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || "";
  const branchId = searchParams.get("branchId") || "";
  const serviceId = searchParams.get("serviceId") || "";
  const date = searchParams.get("date") || "";

  if (!employeeId || !branchId || !serviceId || !date) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const slots = await getAvailableSlots({ employeeId, branchId, serviceId, date: day });
  return NextResponse.json({ slots });
}
