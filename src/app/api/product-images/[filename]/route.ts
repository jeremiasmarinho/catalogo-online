import { get } from "@vercel/blob";
import { isProductImageName } from "@/lib/blob-paths";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!isProductImageName(filename)) return new Response(null, { status: 404 });

  try {
    const blob = await get(`products/${filename}`, { access: "private" });
    if (!blob || blob.statusCode !== 200) return new Response(null, { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Não foi possível carregar a imagem do produto.", error);
    return new Response(null, { status: 500 });
  }
}
