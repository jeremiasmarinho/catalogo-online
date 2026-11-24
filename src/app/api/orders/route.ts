import { NextResponse } from "next/server";
import { STORE_CONFIG } from "@/config/store";
import { prisma } from "@/lib/prisma";
import { formatPrice, isAuthorized } from "@/lib/format";
import {
  consumeRateLimit,
  RATE_LIMITS,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { orderSchema, orderStatusSchema } from "@/lib/schemas";

export const runtime = "nodejs";

class StockUnavailableError extends Error {}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const report = {
    orders,
    summary: {
      count: orders.length,
      pending: orders.filter((order) => order.status === "PENDING").length,
      revenue: orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce((sum, order) => sum + order.total, 0),
    },
  };
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const decision = await consumeRateLimit(
    rateLimitKey(request, "order-create"),
    RATE_LIMITS.orderCreate.limit,
    RATE_LIMITS.orderCreate.windowMs,
  );
  if (!decision.allowed) return rateLimitResponse(decision);

  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira seus dados e os itens do pedido." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  let order;
  try {
    order = await prisma.$transaction(async (transaction) => {
      const products = await transaction.product.findMany({
        where: { id: { in: Array.from(quantities.keys()) }, active: true },
      });
      if (products.length !== quantities.size) throw new StockUnavailableError();

      const productMap = new Map(products.map((product) => [product.id, product]));
      const orderItems = Array.from(quantities, ([productId, quantity]) => {
        const product = productMap.get(productId);
        if (!product || (product.stock !== null && product.stock < quantity)) {
          throw new StockUnavailableError();
        }
        return { product, quantity };
      });

      for (const { product, quantity } of orderItems) {
        if (product.stock === null) continue;
        const updated = await transaction.product.updateMany({
          where: { id: product.id, active: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count !== 1) throw new StockUnavailableError();
      }

      const items = orderItems.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
      }));
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      return transaction.order.create({
        data: {
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          notes: parsed.data.notes,
          total,
          items: { create: items },
        },
        include: { items: true },
      });
    });
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return NextResponse.json(
        { error: "Um ou mais produtos estão indisponíveis ou sem estoque. Atualize o catálogo." },
        { status: 409 },
      );
    }
    throw error;
  }

  const lines = order.items.map(
    (item) => `• ${item.quantity}x ${item.name} — ${formatPrice(item.unitPrice * item.quantity)}`,
  );
  const message = [
    `Olá! Meu pedido na ${STORE_CONFIG.name}:`,
    ...lines,
    `Total: ${formatPrice(order.total)}`,
    `Nome: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
    order.notes ? `Observações: ${order.notes}` : "",
    `Pedido: ${order.id.slice(-8).toUpperCase()}`,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  return NextResponse.json({ orderId: order.id, whatsappUrl }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; status?: string };
  const parsed = orderStatusSchema.safeParse({ status: body.status });
  if (!body.id || !parsed.success) {
    return NextResponse.json({ error: "Dados de status inválidos." }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: body.id },
    include: { items: true },
  });
  if (!existing) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  try {
    const order = await prisma.$transaction(async (transaction) => {
      if (existing.status !== "CANCELLED" && parsed.data.status === "CANCELLED") {
        for (const item of existing.items) {
          if (!item.productId) continue;
          await transaction.product.updateMany({
            where: { id: item.productId, stock: { not: null } },
            data: { stock: { increment: item.quantity } },
          });
        }
      } else if (existing.status === "CANCELLED" && parsed.data.status !== "CANCELLED") {
        for (const item of existing.items) {
          if (!item.productId) continue;
          const updated = await transaction.product.updateMany({
            where: { id: item.productId, stock: { not: null, gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw new StockUnavailableError();
        }
      }

      return transaction.order.update({
        where: { id: body.id },
        data: { status: parsed.data.status },
        include: { items: true },
      });
    });
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return NextResponse.json(
        { error: "Não há estoque disponível para reabrir este pedido." },
        { status: 409 },
      );
    }
    throw error;
  }
}
