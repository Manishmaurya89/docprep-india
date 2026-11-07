/**
 * Writes a pixel density (DPI) into a JPEG or PNG header, so the image opens
 * and prints at a known physical size. Only header bytes change; the pixels
 * are untouched. Other formats are returned unchanged.
 */
export function setImageDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const value = Math.round(dpi);
  if (!(value >= 1 && value <= 65_535)) throw new RangeError("dpi must be between 1 and 65535");
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return setJpegDpi(bytes, value);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return setPngDpi(bytes, value);
  return bytes;
}

const isJfif = (b: Uint8Array, o: number) => b[o] === 0x4a && b[o + 1] === 0x46 && b[o + 2] === 0x49 && b[o + 3] === 0x46 && b[o + 4] === 0;

/** JFIF APP0: units at offset 13 (1 = dots per inch), then X and Y density. */
function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const hi = dpi >> 8;
  const lo = dpi & 0xff;
  if (bytes[2] === 0xff && bytes[3] === 0xe0 && bytes.length > 18 && isJfif(bytes, 6)) {
    const out = bytes.slice();
    out[13] = 1;
    out[14] = hi;
    out[15] = lo;
    out[16] = hi;
    out[17] = lo;
    return out;
  }
  // No JFIF segment first: insert one straight after the start-of-image marker.
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, hi, lo, hi, lo, 0x00, 0x00];
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const writeU32 = (b: Uint8Array, o: number, v: number) => {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
};
const readU32 = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;

/** Puts one pHYs chunk (pixels per metre) right after IHDR, replacing any existing one. */
function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const perMetre = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  writeU32(chunk, 0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  writeU32(chunk, 8, perMetre);
  writeU32(chunk, 12, perMetre);
  chunk[16] = 1; // unit: metre
  writeU32(chunk, 17, crc32(chunk.subarray(4, 17)));

  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return bytes; // Truncated: leave the file as it is.
    const type = String.fromCharCode(bytes[offset + 4]!, bytes[offset + 5]!, bytes[offset + 6]!, bytes[offset + 7]!);
    if (type !== "pHYs") parts.push(bytes.subarray(offset, end));
    if (type === "IHDR" && !inserted) {
      parts.push(chunk);
      inserted = true;
    }
    offset = end;
  }
  if (!inserted) return bytes;
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}
