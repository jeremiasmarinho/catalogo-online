export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_DIMENSION = 2048;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use uma imagem JPG, PNG, WEBP ou GIF.";
  }
  if (file.size === 0) {
    return "Arquivo de imagem vazio.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Imagem acima de 20 MB. Reduza o arquivo antes de enviar.";
  }
  return null;
}

function blobToFile(blob: Blob, originalName: string, type: string): File {
  const ext =
    type === "image/webp" ? "webp" : type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "bin";
  const base = originalName.replace(/\.[^.]+$/, "") || "imagem";
  return new File([blob], `${base}-otimizada.${ext}`, {
    type,
    lastModified: Date.now(),
  });
}

export async function compressImageInBrowser(file: File): Promise<File> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return file;
  }
  if (file.type === "image/png") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (offset + 12 + length > bytes.length) break;
      if (view.getUint32(offset + 4) === 0x6163544c) return file;
      offset += 12 + length;
    }
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    if (scale === 1 && file.size <= 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const compressed = await new Promise<File | null>((resolve) => {
      if (file.type === "image/png") {
        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob?.type === "image/webp" && webpBlob.size < file.size) {
              resolve(blobToFile(webpBlob, file.name, "image/webp"));
              return;
            }
            canvas.toBlob(
              (pngBlob) => {
                if (pngBlob && pngBlob.size < file.size) {
                  resolve(blobToFile(pngBlob, file.name, "image/png"));
                  return;
                }
                resolve(null);
              },
              "image/png",
            );
          },
          "image/webp",
          0.85,
        );
        return;
      }

      canvas.toBlob(
        (jpegBlob) => {
          if (jpegBlob && jpegBlob.size < file.size) {
            resolve(blobToFile(jpegBlob, file.name, "image/jpeg"));
            return;
          }
          resolve(null);
        },
        "image/jpeg",
        0.85,
      );
    });

    return compressed ?? file;
  } catch {
    return file;
  }
}
