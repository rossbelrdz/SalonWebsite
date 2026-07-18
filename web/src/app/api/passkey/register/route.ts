import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getRegistrationOptions, verifyRegistration } from "@/lib/webauthn";

// challenge en memoria (ok para single-instance; multi-instance → Redis)
const challenges = new Map<string, string>();

export async function GET() {
  try {
    const session = await requireSession();
    const options = await getRegistrationOptions(
      session.userId,
      session.email || session.name,
    );
    challenges.set(session.userId, options.challenge);
    return NextResponse.json(options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const expected = challenges.get(session.userId);
    if (!expected) {
      return NextResponse.json({ error: "Challenge expirado; reintenta" }, { status: 400 });
    }
    await verifyRegistration(
      session.userId,
      expected,
      body.response,
      body.nickname,
    );
    challenges.delete(session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error passkey" },
      { status: 400 },
    );
  }
}
