import { deflateSync } from "node:zlib";

/** Minimal PNG encoder for generating test fixtures (RGBA, 8-bit, no interlace). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export type Pixel = [number, number, number, number];

export function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Pixel,
  options: { alpha?: boolean; dpi?: number } = {},
): Uint8Array {
  const alpha = options.alpha ?? true;
  const channels = alpha ? 4 : 3;
  const raw = new Uint8Array((width * channels + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      if (alpha) raw[o++] = a;
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr)];
  if (options.dpi) {
    const phys = new Uint8Array(9);
    const ppm = Math.round(options.dpi / 0.0254);
    new DataView(phys.buffer).setUint32(0, ppm);
    new DataView(phys.buffer).setUint32(4, ppm);
    phys[8] = 1;
    parts.push(chunk("pHYs", phys));
  }
  parts.push(chunk("IDAT", new Uint8Array(deflateSync(raw))), chunk("IEND", new Uint8Array(0)));
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

/** Deterministic pseudo-random noise: hard to compress, like a real photo. */
export function noisePng(width: number, height: number, seed = 1): Uint8Array {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state & 0xff;
  };
  return encodePng(width, height, (x, y) => [(x * 3 + next()) & 0xff, (y * 2 + next()) & 0xff, next(), 255], {
    alpha: false,
  });
}

export function gradientPng(width: number, height: number, alpha = false): Uint8Array {
  return encodePng(
    width,
    height,
    (x, y) => [Math.round((x / width) * 255), Math.round((y / height) * 255), 128, alpha ? (x < width / 2 ? 0 : 255) : 255],
    { alpha },
  );
}
