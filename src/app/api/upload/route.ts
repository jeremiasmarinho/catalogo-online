import { handleUpload } from "@vercel/blob/client";
import { z } from "zod";
import { isPendingImagePath } from "@/lib/blob-paths";
import { readBodyWithLimit, PayloadTooLargeError } from "@/lib/body-limit";
import { isAuthorized } from "@/lib/format";
import { MAX_IMAGE_BYTES } from "@/lib/image-optimize";
import { consumeRateLimit, RATE_LIMITS, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  type: z.literal("blob.generate-client-token"),
  payload: z.object({
    pathname: z.string().refine(isPendingImagePath),
    multipart: z.boolean(),
    clientPayload: z.string().nullable(),
  }),
});

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const decision = await consumeRateLimit(
    rateLimitKey(request, "image-upload"), RATE_LIMITS.productWrite.limit, RATE_LIMITS.productWrite.windowMs,
  );
  if (!decision.allowed) return rateLimitResponse(decision);

  let body: unknown;
  try {
    body = JSON.parse((await readBodyWithLimit(request, 16 * 1024)).toString("utf8"));
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Dados de upload inválidos." }, { status: 400 });
    }
    throw error;
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Dados de upload inválidos." }, { status: 400 });

  try {
    const result = await handleUpload({
      request,
      body: parsed.data,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maximumSizeInBytes: MAX_IMAGE_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 15 * 60 * 1000,
        ttlDays: 1,
      }),
    });
    return Response.json(result);
  } catch (error) {
    console.error("Não foi possível autorizar o upload.", error);
    return Response.json({ error: "Não foi possível autorizar o upload." }, { status: 500 });
  }
}
