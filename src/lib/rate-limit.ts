import { prisma } from "@/lib/prisma";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "ratelimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "ratelimit"."resetAt" <= ${now}
        THEN 1 ELSE LEAST("ratelimit"."count" + 1, ${limit + 1}) END,
      "resetAt" = CASE WHEN "ratelimit"."resetAt" <= ${now}
        THEN ${resetAt} ELSE "ratelimit"."resetAt" END
    RETURNING "count", "resetAt"
  `;
  const entry = rows[0];
  if (!entry) throw new Error("Não foi possível registrar o limite de requisições.");
  if (entry.count <= limit) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitEntry.deleteMany({ where: { key } });
}

export function rateLimitKey(request: Request, scope: string): string {
  const trustProxy =
    process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
  let ip = "default";

  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) ip = first;
    } else {
      const realIp = request.headers.get("x-real-ip")?.trim();
      if (realIp) ip = realIp;
    }
  }

  return `${scope}:${ip}`;
}

export function rateLimitResponse(
  decision: Exclude<RateLimitResult, { allowed: true }>,
): Response {
  return Response.json(
    {
      error: "Muitas tentativas. Aguarde antes de tentar novamente.",
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export const RATE_LIMITS = {
  loginFailures: { limit: 5, windowMs: 15 * 60 * 1000 },
  orderCreate: { limit: 10, windowMs: 60 * 1000 },
  productWrite: { limit: 30, windowMs: 60 * 1000 },
} as const;
