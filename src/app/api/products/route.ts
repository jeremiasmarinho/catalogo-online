import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/format";
import { productSchema } from "@/lib/schemas";

export const runtime = "nodejs";

async function saveImage(image: FormDataEntryValue | null) {
  if (!(image instanceof File) || image.size === 0) return { imageUrl: null };

  const allowedTypes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = allowedTypes[image.type];
  if (!extension || image.size > 5 * 1024 * 1024) {
    return { error: "Use uma imagem JPG, PNG, WEBP ou GIF de até 5 MB." };
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, filename), Buffer.from(await image.arrayBuffer()));
  return { imageUrl: `/uploads/${filename}` };
}

function readProductForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    stock: formData.get("stock") || null,
    categoryId: formData.get("categoryId") || null,
  };
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

  const formData = await request.formData();
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados do produto." }, { status: 400 });
  }

  const categoryId = parsed.data.categoryId || null;
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 400 });
  }

  const imageResult = await saveImage(formData.get("image"));
  if (imageResult.error) {
    return NextResponse.json({ error: imageResult.error }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: { ...parsed.data, categoryId, imageUrl: imageResult.imageUrl },
    include: { category: true },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { id?: string; active?: boolean };
    if (!body.id || typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    const existing = await prisma.product.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    const product = await prisma.product.update({
      where: { id: body.id },
      data: { active: body.active },
    });
    return NextResponse.json(product);
  }

  const formData = await request.formData();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados do produto." }, { status: 400 });
  }
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const categoryId = parsed.data.categoryId || null;
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 400 });
  }
  const imageResult = await saveImage(formData.get("image"));
  if (imageResult.error) {
    return NextResponse.json({ error: imageResult.error }, { status: 400 });
  }
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...parsed.data,
      categoryId,
      ...(imageResult.imageUrl ? { imageUrl: imageResult.imageUrl } : {}),
    },
    include: { category: true },
  });
  return NextResponse.json(product);
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
