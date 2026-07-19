import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { absoluteUrl } from "@/lib/url";

/**
 * Logout: limpia cookie y redirige al home público.
 * No usar `new URL("/", req.url)` — en Docker req.url es http://0.0.0.0:3000/...
 */
export async function POST(req: Request) {
  await clearSessionCookie();

  const accept = req.headers.get("accept") || "";
  // fetch/API con Accept: application/json → JSON; <form> del menú → redirect HTML
  const wantsJson =
    accept.includes("application/json") && !accept.includes("text/html");
  if (!wantsJson && (accept.includes("text/html") || isFormPost(req) || !accept)) {
    return NextResponse.redirect(absoluteUrl("/", req), 303);
  }
  return NextResponse.json({ ok: true });
}

/** POST de <form method="post"> (navegador). */
function isFormPost(req: Request): boolean {
  const ct = req.headers.get("content-type") || "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

export async function GET(req: Request) {
  // Permitir GET por si un link apunta aquí; misma limpieza + redirect.
  await clearSessionCookie();
  return NextResponse.redirect(absoluteUrl("/login", req), 303);
}
