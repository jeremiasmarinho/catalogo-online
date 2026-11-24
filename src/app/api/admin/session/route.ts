import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  createSessionCookie,
  isAdminSessionValid,
  passwordsMatch,
} from "@/lib/admin-auth";
import {
  consumeRateLimit,
  RATE_LIMITS,
  rateLimitKey,
  rateLimitResponse,
  resetRateLimit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || expected.length < 12) {
    return NextResponse.json(
      { error: "Configure ADMIN_PASSWORD com pelo menos 12 caracteres." },
      { status: 503 },
    );
  }

  const key = rateLimitKey(request, "login");
  const decision = await consumeRateLimit(
    key,
    RATE_LIMITS.loginFailures.limit,
    RATE_LIMITS.loginFailures.windowMs,
  );
  if (!decision.allowed) return rateLimitResponse(decision);

  if (
    typeof body?.password !== "string" ||
    !passwordsMatch(body.password, expected)
  ) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  await resetRateLimit(key);
  const response = NextResponse.json({ authenticated: true });
  response.headers.set("Set-Cookie", createSessionCookie(expected));
  return response;
}

export async function GET(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  const authenticated = Boolean(
    expected &&
      expected.length >= 12 &&
      isAdminSessionValid(request, expected),
  );
  return NextResponse.json({ authenticated });
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ authenticated: false });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
