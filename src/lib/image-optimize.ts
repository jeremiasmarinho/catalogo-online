import sharp, { type Metadata, type Sharp } from "sharp";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 1024 * 1024;
export const MAX_DIMENSION = 2048;
const MAX_DECODE_PIXELS = 40_000_000;
const MAX_ANIMATED_PIXELS = 80_000_000;

export class ImageProcessingError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImageProcessingError";
    this.status = status;
  }
}

export type OptimizedImage = {
  buffer: Buffer;
  extension: "jpg" | "png" | "webp" | "gif";
  contentType: string;
};

type SniffedFormat = "jpeg" | "png" | "webp" | "gif";
type OutputFormat = OptimizedImage["extension"];

const CONTENT_TYPES: Record<OutputFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function sniffImageType(buf: Buffer): SniffedFormat | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}

function encodeWithFormat(
  pipeline: Sharp,
  format: OutputFormat,
  quality: number,
): Promise<Buffer> {
  if (format === "png") {
    return pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
  if (format === "webp") {
    return pipeline
      .webp({ quality, alphaQuality: quality, effort: 4 })
      .toBuffer();
  }
  if (format === "gif") {
    return pipeline.gif({ effort: 10, colours: 256 }).toBuffer();
  }
  return pipeline
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toBuffer();
}

async function tryFormats(
  buildPipeline: () => Sharp,
  formats: OutputFormat[],
): Promise<{ buffer: Buffer; extension: OutputFormat }> {
  for (const format of formats) {
    const qualities = format === "png" ? [100] : [82, 74, 66, 58, 50];
    for (const quality of qualities) {
      const buffer = await encodeWithFormat(buildPipeline(), format, quality);
      if (buffer.byteLength <= MAX_OUTPUT_BYTES) {
        return { buffer, extension: format };
      }
    }
  }
  throw new ImageProcessingError(
    "Não foi possível reduzir a imagem para até 1 MB sem gerar um arquivo inválido. Tente outra foto.",
  );
}

async function optimizeStatic(
  input: Buffer,
  sniffed: SniffedFormat,
  meta: Metadata,
): Promise<OptimizedImage> {
  const hasAlpha = Boolean(meta.hasAlpha);
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new ImageProcessingError("Imagem corrompida ou com dimensões inválidas.");
  }
  if (width * height > MAX_DECODE_PIXELS) {
    throw new ImageProcessingError("Imagem com pixels excessivos.");
  }

  const buildPipeline = () =>
    sharp(input, { limitInputPixels: MAX_DECODE_PIXELS, failOn: "error" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });

  let formats: OutputFormat[];
  if (hasAlpha) {
    formats = ["webp"];
  } else if (sniffed === "webp") {
    formats = ["webp", "jpg"];
  } else {
    formats = ["jpg"];
  }

  const { buffer, extension } = await tryFormats(buildPipeline, formats);
  return { buffer, extension, contentType: CONTENT_TYPES[extension] };
}

async function optimizeAnimated(
  input: Buffer,
  sniffed: SniffedFormat,
  meta: Metadata,
): Promise<OptimizedImage> {
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const pages = meta.pages ?? 1;
  if (!width || !height) {
    throw new ImageProcessingError("Animação corrompida ou com dimensões inválidas.");
  }
  if (width * (meta.pageHeight ?? height) * pages > MAX_ANIMATED_PIXELS) {
    throw new ImageProcessingError("Animação com pixels excessivos.");
  }

  const keepGif = sniffed === "gif";
  const keepWebp = sniffed === "webp";
  if (!keepGif && !keepWebp) {
    throw new ImageProcessingError("Formato animado não suportado.");
  }

  const extension: OutputFormat = keepGif ? "gif" : "webp";
  const attempts: { maxDimension: number; quality: number }[] = [
    { maxDimension: MAX_DIMENSION, quality: 75 },
    { maxDimension: MAX_DIMENSION, quality: 60 },
    { maxDimension: 1600, quality: 65 },
    { maxDimension: 1280, quality: 65 },
    { maxDimension: 1024, quality: 60 },
  ];

  for (const attempt of attempts) {
    const pipeline = sharp(input, {
      animated: true,
      limitInputPixels: MAX_ANIMATED_PIXELS,
      failOn: "error",
    }).resize({
      width: attempt.maxDimension,
      height: attempt.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });

    const buffer = await encodeWithFormat(pipeline, extension, attempt.quality);
    if (buffer.byteLength <= MAX_OUTPUT_BYTES) {
      return { buffer, extension, contentType: CONTENT_TYPES[extension] };
    }
  }

  throw new ImageProcessingError(
    "Não foi possível manter a animação dentro do limite de 1 MB. Converta para uma imagem estática ou use um GIF/WEBP menor.",
  );
}

export async function optimizeUploadedImage(input: Buffer, declaredType?: string): Promise<OptimizedImage> {
  if (input.byteLength === 0) {
    throw new ImageProcessingError("Arquivo de imagem vazio.");
  }
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageProcessingError("Imagem acima do limite de 20 MB.", 413);
  }

  const sniffed = sniffImageType(input);
  if (!sniffed) {
    throw new ImageProcessingError("Arquivo corrompido ou formato não suportado.");
  }
  const expectedType = sniffed === "jpeg" ? "image/jpeg" : `image/${sniffed}`;
  if (declaredType !== undefined && declaredType !== expectedType) {
    throw new ImageProcessingError("O formato da imagem não corresponde ao arquivo enviado.");
  }

  let meta: Metadata;
  try {
    meta = await sharp(input, {
      limitInputPixels: MAX_DECODE_PIXELS,
      animated: true,
      failOn: "error",
    }).metadata();
  } catch {
    throw new ImageProcessingError(
      "Não foi possível ler a imagem. O arquivo pode estar corrompido.",
    );
  }

  const pages = meta.pages ?? 1;
  if (pages > 1) {
    return optimizeAnimated(input, sniffed, meta);
  }
  return optimizeStatic(input, sniffed, meta);
}
