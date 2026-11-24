import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { isPendingImagePath, isProductImageName } from "../src/lib/blob-paths.ts";
import { MAX_OUTPUT_BYTES, optimizeUploadedImage } from "../src/lib/image-optimize.ts";

test("separates temporary upload paths from public product image names", () => {
  const uuid = "e9c985b2-7cb4-4d12-8d75-396a08af3b13";
  assert.equal(isPendingImagePath(`pending/${uuid}`), true);
  assert.equal(isPendingImagePath(`products/${uuid}.jpg`), false);
  assert.equal(isPendingImagePath(`pending/${uuid}/../other`), false);
  assert.equal(isProductImageName(`${uuid}.webp`), true);
  assert.equal(isProductImageName(`pending/${uuid}`), false);
  assert.equal(isProductImageName(`${uuid}.svg`), false);
});

test("reduces a large JPEG before storage", async () => {
  const input = await sharp(randomBytes(2800 * 2800 * 3), {
    raw: { width: 2800, height: 2800, channels: 3 },
  }).jpeg({ quality: 90 }).toBuffer();
  assert.ok(input.length > 5 * 1024 * 1024 && input.length <= 20 * 1024 * 1024);
  const result = await optimizeUploadedImage(input, "image/jpeg");
  const metadata = await sharp(result.buffer).metadata();
  assert.ok(result.buffer.length <= MAX_OUTPUT_BYTES);
  assert.ok(metadata.width <= 2048 && metadata.height <= 2048);
});

test("preserves transparency and animated GIF and WEBP frames", async () => {
  const png = await sharp({
    create: { width: 30, height: 20, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.3 } },
  }).png().toBuffer();
  const image = await optimizeUploadedImage(png, "image/png");
  const pngMetadata = await sharp(image.buffer).metadata();
  assert.equal(pngMetadata.hasAlpha, true);
  assert.equal(pngMetadata.width, 30);
  assert.equal(pngMetadata.height, 20);

  const pixels = Buffer.alloc(20 * 40 * 4, 255);
  for (let i = 20 * 20 * 4; i < pixels.length; i += 4) {
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
  }
  const gif = await sharp(pixels, {
    raw: { width: 20, height: 40, channels: 4, pageHeight: 20 },
  }).gif({ delay: [100, 100] }).toBuffer();
  const animation = await optimizeUploadedImage(gif, "image/gif");
  assert.equal((await sharp(animation.buffer, { animated: true }).metadata()).pages, 2);
  const webp = await sharp(pixels, {
    raw: { width: 20, height: 40, channels: 4, pageHeight: 20 },
  }).webp({ delay: [100, 100] }).toBuffer();
  const webpAnimation = await optimizeUploadedImage(webp, "image/webp");
  assert.equal((await sharp(webpAnimation.buffer, { animated: true }).metadata()).pages, 2);
});

test("applies EXIF orientation and removes metadata", async () => {
  const jpeg = await sharp({
    create: { width: 30, height: 20, channels: 3, background: "blue" },
  }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const image = await optimizeUploadedImage(jpeg, "image/jpeg");
  const metadata = await sharp(image.buffer).metadata();
  assert.equal(metadata.width, 20);
  assert.equal(metadata.height, 30);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
});

test("rejects oversized, corrupt and mismatched input", async () => {
  const jpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).jpeg().toBuffer();
  await assert.rejects(() => optimizeUploadedImage(jpeg, "image/png"));
  await assert.rejects(() => optimizeUploadedImage(Buffer.from("not an image"), "image/jpeg"));
  await assert.rejects(
    () => optimizeUploadedImage(Buffer.alloc(20 * 1024 * 1024 + 1), "image/jpeg"),
    (error) => error.status === 413,
  );
});
