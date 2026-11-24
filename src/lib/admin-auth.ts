import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "catalogo_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function createSignature(timestamp: string, password: string): string {
  return createHmac("sha256", `${password}:catalogo-admin-session-v1`)
    .update(timestamp)
    .digest("hex");
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function createAdminSession(password: string): string {
  const timestamp = String(Date.now());
  return `${timestamp}.${createSignature(timestamp, password)}`;
}

export function isAdminSessionValid(request: Request, password: string): boolean {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!cookie) return false;

  const [timestamp, signature] = cookie.split(".");
  const issuedAt = Number(timestamp);
  if (
    !timestamp ||
    !signature ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > Date.now() ||
    Date.now() - issuedAt > SESSION_TTL_SECONDS * 1000
  ) {
    return false;
  }

  const expectedSignature = Buffer.from(createSignature(timestamp, password));
  const providedSignature = Buffer.from(signature);
  return (
    expectedSignature.length === providedSignature.length &&
    timingSafeEqual(providedSignature, expectedSignature)
  );
}

export function createSessionCookie(password: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${createAdminSession(password)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`;
}
