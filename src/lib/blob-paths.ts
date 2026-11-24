const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function isPendingImagePath(value: string): boolean {
  return new RegExp(`^pending/${UUID}$`).test(value);
}

export function isProductImageName(value: string): boolean {
  return new RegExp(`^${UUID}\\.(jpg|png|webp|gif)$`).test(value);
}
