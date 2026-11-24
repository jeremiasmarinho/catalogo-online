export class PayloadTooLargeError extends Error {
  readonly status = 413;

  constructor(message = "Corpo da requisição excede o limite permitido.") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<Buffer> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof PayloadTooLargeError) throw error;
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  return Buffer.concat(chunks, total);
}

export async function formDataFromBody(
  request: Request,
  body: Buffer,
): Promise<FormData> {
  const contentType = request.headers.get("content-type");
  if (!contentType) {
    throw new Error("Content-Type ausente na requisição.");
  }

  const synthetic = new Request("http://localhost/multipart", {
    method: "POST",
    headers: { "content-type": contentType },
    body: new Uint8Array(body),
  });

  return synthetic.formData();
}
