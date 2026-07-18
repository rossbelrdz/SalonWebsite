import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  await clearSessionCookie();
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }
  return NextResponse.json({ ok: true });
}
