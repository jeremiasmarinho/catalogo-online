import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/format";
import { formDataFromBody, PayloadTooLargeError, readBodyWithLimit } from "@/lib/body-limit";
import { consumeRateLimit, RATE_LIMITS, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { productSchema } from "@/lib/schemas";
import { isPendingImagePath } from "@/lib/blob-paths";
import { processBlobImage } from "@/lib/blob-upload";

export const runtime = "nodejs";

const MAX_FORM_BYTES = 64 * 1024;

function readProductForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    stock: formData.get("stock") || null,
    categoryId: formData.get("categoryId") || null,
  };
}

async function readProductRequest(request: Request) {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return { error: "Tipo de conteúdo não suportado.", status: 415 } as const;
  }
  try {
    const body = await readBodyWithLimit(request, MAX_FORM_BYTES);
    return { formData: await formDataFromBody(request, body) } as const;
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return { error: error.message, status: 413 } as const;
    }
    if (error instanceof TypeError) {
      return { error: "Dados do formulário inválidos.", status: 400 } as const;
    }
    throw error;
  }
}

async function saveProduct(request: Request, editing: boolean) {
  const parsedRequest = await readProductRequest(request);
  if ("error" in parsedRequest) {
    return NextResponse.json({ error: parsedRequest.error }, { status: parsedRequest.status });
  }
  const { formData } = parsedRequest;
  const id = formData.get("id");
  if (editing && (typeof id !== "string" || !id)) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados do produto." }, { status: 400 });
  }
  if (editing && typeof id === "string" && !(await prisma.product.findUnique({ where: { id } }))) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  const categoryId = parsed.data.categoryId || null;
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 400 });
  }
  const image = formData.get("imageKey");
  if (image !== null && (typeof image !== "string" || !isPendingImagePath(image))) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }
  const saved = image ? await processBlobImage(image) : null;
  if (saved && !saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }

  try {
    const product = editing && typeof id === "string"
      ? await prisma.product.update({
          where: { id },
          data: { ...parsed.data, categoryId, ...(saved ? { imageUrl: saved.imageUrl } : {}) },
          include: { category: true },
        })
      : await prisma.product.create({
          data: { ...parsed.data, categoryId, imageUrl: saved?.imageUrl ?? null },
          include: { category: true },
        });
    return NextResponse.json(product, { status: editing ? 200 : 201 });
  } catch (error) {
    if (saved) {
      try {
        await del(saved.pathname);
      } catch (cleanupError) {
        console.error("Não foi possível remover a imagem após falha ao salvar o produto.", cleanupError);
      }
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "true";
  if (includeInactive && !isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const products = await prisma.product.findMany({
    where: includeInactive
      ? undefined
      : { active: true, OR: [{ stock: null }, { stock: { gt: 0 } }] },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const decision = await consumeRateLimit(
    rateLimitKey(request, "product-write"), RATE_LIMITS.productWrite.limit, RATE_LIMITS.productWrite.windowMs,
  );
  if (!decision.allowed) return rateLimitResponse(decision);
  return saveProduct(request, false);
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const decision = await consumeRateLimit(
    rateLimitKey(request, "product-write"), RATE_LIMITS.productWrite.limit, RATE_LIMITS.productWrite.windowMs,
  );
  if (!decision.allowed) return rateLimitResponse(decision);

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json() as { id?: string; active?: boolean };
    if (!body.id || typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    const existing = await prisma.product.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    const product = await prisma.product.update({ where: { id: body.id }, data: { active: body.active } });
    return NextResponse.json(product);
  }
  return saveProduct(request, true);
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await request.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
