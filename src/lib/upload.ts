import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ImageProcessingError,
  MAX_IMAGE_BYTES,
  optimizeUploadedImage,
} from "@/lib/image-optimize";

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export type SaveImageSuccess = {
  ok: true;
  imageUrl: string;
  absolutePath: string;
};

export type SaveImageFailure = {
  ok: false;
  error: string;
  status: number;
};

export type SaveImageResult = SaveImageSuccess | SaveImageFailure;

export function resolveUploadFilePath(urlPath: string): string | null {
  if (!urlPath.startsWith("/uploads/")) return null;
  const name = path.posix.basename(urlPath);
  if (!name || name.includes("..") || name.includes("\0")) return null;
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  const resolved = path.join(UPLOAD_DIR, name);
  const root = path.resolve(UPLOAD_DIR);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export async function removeUploadedFile(absolutePath: string): Promise<void> {
  const root = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(absolutePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return;
  try {
    await unlink(resolved);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}

export async function processAndSaveImage(file: File): Promise<SaveImageResult> {
  if (file.size === 0) {
    return { ok: false, error: "Arquivo de imagem vazio.", status: 400 };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Use uma imagem JPG, PNG, WEBP ou GIF de até 20 MB.", status: 413 };
  }

  let optimized;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    optimized = await optimizeUploadedImage(input, file.type);
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return { ok: false, error: error.message, status: error.status };
    }
    console.error("Falha inesperada ao processar imagem.", error);
    return {
      ok: false,
      error: "Não foi possível processar a imagem. Tente novamente.",
      status: 500,
    };
  }

  let absolutePath: string | undefined;
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${optimized.extension}`;
    absolutePath = path.join(UPLOAD_DIR, filename);
    await writeFile(absolutePath, optimized.buffer, { flag: "wx" });
    return { ok: true, imageUrl: `/uploads/${filename}`, absolutePath };
  } catch (error) {
    console.error("Falha ao salvar imagem no armazenamento local.", error);
    if (absolutePath && !(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      try {
        await removeUploadedFile(absolutePath);
      } catch (cleanupError) {
        console.error("Falha ao remover imagem incompleta.", cleanupError);
      }
    }
    return {
      ok: false,
      error: "Não foi possível salvar a imagem no servidor.",
      status: 500,
    };
  }
}
