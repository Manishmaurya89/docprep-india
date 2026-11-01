/**
 * Removes metadata from a JPEG without re-encoding it. Used where original
 * bytes are kept (pdf-lib embeds JPEGs as they are), so camera metadata —
 * EXIF with GPS location, XMP, IPTC, comments — does not end up in the output.
 *
 * Kept: everything needed to decode the image as before, i.e. all non-APP
 * segments, JFIF (APP0), the ICC colour profile (APP2) and the Adobe colour
 * transform (APP14). Data after the end-of-image marker (appended previews,
 * depth maps, motion-photo video) is dropped.
 *
 * Returns null when the structure is not understood; callers then re-encode.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  const n = bytes.length;
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const kept: Array<[number, number]> = [[0, 2]];
  let i = 2;
  while (i + 1 < n) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0xd9) {
      kept.push([i, i + 2]);
      return concat(bytes, kept);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push([i, i + 2]);
      i += 2;
      continue;
    }
    if (i + 4 > n) return null;
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    const end = i + 2 + length;
    if (length < 2 || end > n) return null;
    if (marker === 0xda) {
      // Entropy-coded data follows the scan header. Inside it 0xFF is always
      // followed by 0x00 (stuffing) or a restart marker; anything else is the next marker.
      let j = end;
      while (j + 1 < n && !(bytes[j] === 0xff && bytes[j + 1] !== 0x00 && !(bytes[j + 1]! >= 0xd0 && bytes[j + 1]! <= 0xd7))) j++;
      if (j + 1 >= n) return null; // no end-of-image marker
      kept.push([i, j]);
      i = j;
      continue;
    }
    if (!isMetadataSegment(bytes, marker, i + 4, end)) kept.push([i, end]);
    i = end;
  }
  return null;
}

function startsWith(bytes: Uint8Array, start: number, end: number, signature: string): boolean {
  if (start + signature.length > end) return false;
  for (let k = 0; k < signature.length; k++) if (bytes[start + k] !== signature.charCodeAt(k)) return false;
  return true;
}

function isMetadataSegment(bytes: Uint8Array, marker: number, start: number, end: number): boolean {
  if (marker === 0xfe) return true; // COM
  if (marker < 0xe0 || marker > 0xef) return false;
  if (marker === 0xe0) return !startsWith(bytes, start, end, "JFIF\0");
  if (marker === 0xe2) return !startsWith(bytes, start, end, "ICC_PROFILE\0");
  if (marker === 0xee) return !startsWith(bytes, start, end, "Adobe");
  return true;
}

function concat(bytes: Uint8Array, ranges: Array<[number, number]>): Uint8Array {
  const out = new Uint8Array(ranges.reduce((sum, [start, end]) => sum + end - start, 0));
  let offset = 0;
  for (const [start, end] of ranges) {
    out.set(bytes.subarray(start, end), offset);
    offset += end - start;
  }
  return out;
}
