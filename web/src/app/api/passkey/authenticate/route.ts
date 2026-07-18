import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { getAuthenticationOptions, verifyAuthentication } from "@/lib/webauthn";

const challenges = new Map<string, string>();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    let userId: string | undefined;
    if (email) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      userId = user.id;
    }
    const options = await getAuthenticationOptions(userId);
    const key = userId || "anon";
    challenges.set(key, options.challenge);
    // también por challenge para lookup
    challenges.set(options.challenge, key);
    return NextResponse.json({ ...options, userId: userId || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo iniciar passkey" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const challenge = String(body.challenge || "");
    const expectedKey = challenges.get(challenge) || body.userId;
    // challenge stored as value under userId key
    let expectedChallenge = challenge;
    if (body.userId && challenges.has(body.userId)) {
      expectedChallenge = challenges.get(body.userId)!;
    }

    const { user } = await verifyAuthentication(expectedChallenge, body.response);

    if (!user.active) {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 403 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, active: true },
    });

    await setSessionCookie({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: membership?.tenantId ?? null,
      role: membership?.role ?? null,
    });

    challenges.delete(user.id);
    challenges.delete(expectedChallenge);

    let redirect = "/mis-citas";
    if (user.isSuperAdmin || membership?.role === "ADMIN") redirect = "/admin";
    else if (membership?.role === "EMPLOYEE") redirect = "/empleado";

    return NextResponse.json({ ok: true, redirect });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Passkey falló" },
      { status: 400 },
    );
  }
}
