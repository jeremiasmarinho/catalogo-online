import { STORE_CONFIG } from "@/config/store";
import { isAdminSessionValid } from "@/lib/admin-auth";

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: "currency",
    currency: STORE_CONFIG.currency,
  }).format(cents / 100);
}

export function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(
    expected &&
      expected.length >= 12 &&
      isAdminSessionValid(request, expected),
  );
}
