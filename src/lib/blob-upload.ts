import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { isPendingImagePath } from "@/lib/blob-paths";
import {
  ImageProcessingError,
  MAX_IMAGE_BYTES,
  optimizeUploadedImage,
} from "@/lib/image-optimize";

type SaveImageResult =
  | { ok: true; imageUrl: string; pathname: string }
  | { ok: false; error: string; status: number };

export async function processBlobImage(pathname: string): Promise<SaveImageResult> {
  if (!isPendingImagePath(pathname)) {
    return { ok: false, error: "Imagem inválida.", status: 400 };
  }

  try {
    const blob = await get(pathname, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) {
      return { ok: false, error: "Imagem temporária não encontrada. Envie-a novamente.", status: 400 };
    }
    if (blob.blob.size > MAX_IMAGE_BYTES) {
      await blob.stream.cancel();
      return { ok: false, error: "Imagem acima do limite de 20 MB.", status: 413 };
    }
    const reader = blob.stream.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return { ok: false, error: "Imagem acima do limite de 20 MB.", status: 413 };
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const image = await optimizeUploadedImage(Buffer.concat(chunks, size), blob.blob.contentType);
    const filename = `${randomUUID()}.${image.extension}`;
    const result = await put(`products/${filename}`, image.buffer, {
      access: "private",
      contentType: image.contentType,
      addRandomSuffix: false,
    });
    return { ok: true, imageUrl: `/api/product-images/${filename}`, pathname: result.pathname };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return { ok: false, error: error.message, status: error.status };
    }
    console.error("Não foi possível processar ou armazenar a imagem.", error);
    return { ok: false, error: "Não foi possível processar a imagem. Tente novamente.", status: 500 };
  } finally {
    try {
      await del(pathname);
    } catch (error) {
      console.error("Não foi possível remover a imagem temporária; ela expirará automaticamente.", error);
    }
  }
}
