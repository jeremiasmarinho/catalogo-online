import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSlug, isAuthorized } from "@/lib/format";
import { categorySchema } from "@/lib/schemas";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome de categoria inválido." }, { status: 400 });
  }

  const slugBase = createSlug(parsed.data.name);
  if (!slugBase) {
    return NextResponse.json({ error: "Informe um nome válido." }, { status: 400 });
  }
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`;
  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
