import { detectFormat, type ImageFormat } from "./detect";

/**
 * Reads image properties directly from file headers. Used to validate inputs
 * cheaply and — more importantly — to verify outputs from the actual bytes
 * produced, rather than trusting what the encoder was asked to do.
 */
export interface ImageMetadata {
  format: ImageFormat;
  /** Stored pixel dimensions (before EXIF orientation is applied). */
  width: number;
  height: number;
  /** Whether the format/header declares an alpha channel. */
  hasAlpha: boolean;
  /** EXIF orientation 1–8 when present (JPEG only). */
  orientation?: number;
  /** Pixel density if declared in JFIF APP0 or PNG pHYs. */
  dpi?: { x: number; y: number };
  /** JPEG colour components (1 = greyscale, 3 = YCbCr/RGB, 4 = CMYK). */
  components?: number;
}

const u16be = (b: Uint8Array, o: number) => ((b[o]! << 8) | b[o + 1]!) >>> 0;
const u32be = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
const u16le = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8)) >>> 0;
const u24le = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16)) >>> 0;
const u32le = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!);

export function readImageMetadata(bytes: Uint8Array): ImageMetadata | null {
  const format = detectFormat(bytes);
  try {
    if (format === "jpeg") return readJpeg(bytes);
    if (format === "png") return readPng(bytes);
    if (format === "webp") return readWebp(bytes);
  } catch {
    return null;
  }
  return null;
}

/** Dimensions after EXIF orientation (what the user sees). */
export function orientedSize(meta: Pick<ImageMetadata, "width" | "height" | "orientation">): {
  width: number;
  height: number;
} {
  return meta.orientation !== undefined && meta.orientation >= 5 && meta.orientation <= 8
    ? { width: meta.height, height: meta.width }
    : { width: meta.width, height: meta.height };
}

function readPng(b: Uint8Array): ImageMetadata | null {
  if (b.length < 33 || tag(b, 12) !== "IHDR") return null;
  const width = u32be(b, 16);
  const height = u32be(b, 20);
  const colorType = b[25]!;
  let hasAlpha = colorType === 4 || colorType === 6;
  let dpi: ImageMetadata["dpi"];
  let offset = 8;
  while (offset + 8 <= b.length) {
    const length = u32be(b, offset);
    const type = tag(b, offset + 4);
    if (type === "tRNS") hasAlpha = true;
    if (type === "pHYs" && offset + 17 <= b.length && b[offset + 16] === 1) {
      dpi = { x: Math.round(u32be(b, offset + 8) * 0.0254), y: Math.round(u32be(b, offset + 12) * 0.0254) };
    }
    if (type === "IDAT" || type === "IEND") break;
    offset += 12 + length;
  }
  if (!width || !height) return null;
  return { format: "png", width, height, hasAlpha, dpi };
}

function readJpeg(b: Uint8Array): ImageMetadata | null {
  let offset = 2;
  let dpi: ImageMetadata["dpi"];
  let orientation: number | undefined;
  while (offset + 4 <= b.length) {
    if (b[offset] !== 0xff) return null;
    const marker = b[offset + 1]!;
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / SOS before SOF
    const length = u16be(b, offset + 2);
    const segment = offset + 4;

    if (marker === 0xe0 && length >= 16 && tag(b, segment) === "JFIF" && b[segment + 4] === 0) {
      const units = b[segment + 7];
      const x = u16be(b, segment + 8);
      const y = u16be(b, segment + 10);
      if (units === 1) dpi = { x, y };
      else if (units === 2) dpi = { x: Math.round(x * 2.54), y: Math.round(y * 2.54) };
    }
    if (marker === 0xe1 && length >= 14 && tag(b, segment) === "Exif") {
      orientation = readExifOrientation(b, segment + 6, segment + length - 2) ?? orientation;
    }
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = u16be(b, segment + 1);
      const width = u16be(b, segment + 3);
      const components = b[segment + 5];
      if (!width || !height) return null;
      return { format: "jpeg", width, height, hasAlpha: false, dpi, orientation, components };
    }
    offset += 2 + length;
  }
  return null;
}

function readExifOrientation(b: Uint8Array, tiffStart: number, end: number): number | undefined {
  if (tiffStart + 8 > end) return undefined;
  const little = b[tiffStart] === 0x49 && b[tiffStart + 1] === 0x49;
  const r16 = (o: number) => (little ? u16le(b, o) : u16be(b, o));
  const r32 = (o: number) => (little ? u32le(b, o) : u32be(b, o));
  if (r16(tiffStart + 2) !== 42) return undefined;
  const ifd = tiffStart + r32(tiffStart + 4);
  if (ifd + 2 > end) return undefined;
  const entries = r16(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) break;
    if (r16(entry) === 0x0112) {
      const value = r16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}

function readWebp(b: Uint8Array): ImageMetadata | null {
  if (b.length < 30) return null;
  const chunk = tag(b, 12);
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { format: "webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff, hasAlpha: false };
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = u32le(b, 21);
    return {
      format: "webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      hasAlpha: ((bits >>> 28) & 1) === 1,
    };
  }
  if (chunk === "VP8X") {
    return {
      format: "webp",
      width: u24le(b, 24) + 1,
      height: u24le(b, 27) + 1,
      hasAlpha: (b[20]! & 0x10) !== 0,
    };
  }
  return null;
}
