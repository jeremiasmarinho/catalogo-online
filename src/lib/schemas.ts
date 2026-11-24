import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  price: z.coerce.number().int().min(0).max(100_000_000),
  stock: z.preprocess(
    (value) => (value === null || value === "" ? null : typeof value === "string" ? Number(value) : value),
    z.number().int().min(0).nullable(),
  ),
  categoryId: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(8).max(24),
  notes: z.string().trim().max(500).default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});
