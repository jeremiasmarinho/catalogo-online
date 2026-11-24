import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) return notFound();

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment.includes("..") ||
        segment.includes("\0") ||
        segment.includes("/") ||
        segment.includes("\\"),
    )
  ) {
    return notFound();
  }

  const filename = segments[segments.length - 1];
  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return notFound();

  const root = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(UPLOAD_DIR, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return notFound();
  }

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) return notFound();

    const data = await readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return notFound();
    console.error("Não foi possível ler a imagem do armazenamento local.", error);
    return new NextResponse(null, { status: 500 });
  }
}
