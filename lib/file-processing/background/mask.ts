/**
 * Mask maths for the photo background tool. Pure functions on Float32Arrays
 * (values 0–1, row-major), so they run anywhere and are unit-tested.
 *
 * The person-segmentation model works at 256 × 256, so its mask is soft and
 * blocky once enlarged. A guided filter (He, Sun & Tang, 2010) snaps that
 * mask to the edges in the photo itself — hair, ears, shoulders — using the
 * photo's brightness as the guide.
 */

/** Mean over a (2r+1)² window, clamped at the borders (each pixel divides by the pixels actually inside). O(n), whatever the radius. */
export function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (src.length !== width * height) throw new RangeError("Mask size does not match its dimensions.");
  const r = Math.max(0, Math.floor(radius));
  if (r === 0) return src.slice();
  const horizontal = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    // Window [x - r, x + r] clamped to the row.
    for (let x = 0; x <= Math.min(r, width - 1); x++) sum += src[row + x]!;
    for (let x = 0; x < width; x++) {
      const left = x - r;
      const right = x + r;
      const count = Math.min(right, width - 1) - Math.max(left, 0) + 1;
      horizontal[row + x] = sum / count;
      if (right + 1 < width) sum += src[row + right + 1]!;
      if (left >= 0) sum -= src[row + left]!;
    }
  }
  const out = new Float32Array(src.length);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y <= Math.min(r, height - 1); y++) sum += horizontal[y * width + x]!;
    for (let y = 0; y < height; y++) {
      const top = y - r;
      const bottom = y + r;
      const count = Math.min(bottom, height - 1) - Math.max(top, 0) + 1;
      out[y * width + x] = sum / count;
      if (bottom + 1 < height) sum += horizontal[(bottom + 1) * width + x]!;
      if (top >= 0) sum -= horizontal[top * width + x]!;
    }
  }
  return out;
}

/**
 * Edge-aware smoothing of `mask` guided by `guide` (both 0–1). Where the
 * guide is flat the mask is smoothed; where the guide has an edge, the
 * result follows that edge. `eps` sets how strong an edge must be to count.
 */
export function guidedFilter(guide: Float32Array, mask: Float32Array, width: number, height: number, radius: number, eps: number): Float32Array {
  if (guide.length !== mask.length || mask.length !== width * height) throw new RangeError("Guide and mask sizes differ.");
  const n = mask.length;
  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ip[i] = guide[i]! * mask[i]!;
    ii[i] = guide[i]! * guide[i]!;
  }
  const meanI = boxBlur(guide, width, height, radius);
  const meanP = boxBlur(mask, width, height, radius);
  const meanIp = boxBlur(ip, width, height, radius);
  const meanII = boxBlur(ii, width, height, radius);
  const a = ip; // reuse buffers
  const b = ii;
  for (let i = 0; i < n; i++) {
    const variance = meanII[i]! - meanI[i]! * meanI[i]!;
    const covariance = meanIp[i]! - meanI[i]! * meanP[i]!;
    a[i] = covariance / (variance + eps);
    b[i] = meanP[i]! - a[i]! * meanI[i]!;
  }
  const meanA = boxBlur(a, width, height, radius);
  const meanB = boxBlur(b, width, height, radius);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = clamp01(meanA[i]! * guide[i]! + meanB[i]!);
  return out;
}

/** Stretches the soft middle of a mask so edges are crisp and stray haze disappears: below `low` → 0, above `high` → 1. */
export function sharpenMask(mask: Float32Array, low = 0.2, high = 0.8): Float32Array {
  if (!(low >= 0 && high <= 1 && low < high)) throw new RangeError("Invalid mask thresholds.");
  const out = new Float32Array(mask.length);
  const span = high - low;
  for (let i = 0; i < mask.length; i++) out[i] = clamp01((mask[i]! - low) / span);
  return out;
}

/** Brightness (0–1, Rec. 601 weights) of RGBA pixels. */
export function luminance(rgba: Uint8ClampedArray | Uint8Array): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (0.299 * rgba[p]! + 0.587 * rgba[p + 1]! + 0.114 * rgba[p + 2]!) / 255;
  }
  return out;
}

/**
 * Smooths a live mask over time so the edge does not flicker between camera
 * frames: `keep` of the previous mask plus the rest of the new one. Writes
 * into and returns `previous` when the sizes match; otherwise returns a copy
 * of `next`.
 */
export function blendMasks(previous: Float32Array | null, next: Float32Array, keep: number): Float32Array {
  if (!previous || previous.length !== next.length) return next.slice();
  const k = Math.min(Math.max(keep, 0), 1);
  for (let i = 0; i < next.length; i++) previous[i] = previous[i]! * k + next[i]! * (1 - k);
  return previous;
}

/** Writes a mask into the alpha channel of RGBA pixels (colour channels set to white). */
export function maskToRgba(mask: Float32Array, out: Uint8ClampedArray): void {
  if (out.length !== mask.length * 4) throw new RangeError("Pixel buffer does not match the mask.");
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    out[p] = 255;
    out[p + 1] = 255;
    out[p + 2] = 255;
    out[p + 3] = Math.round(clamp01(mask[i]!) * 255);
  }
}

/** Share of the mask that is person (≥ 0.5). */
export function coverage(mask: Float32Array): number {
  if (mask.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]! >= 0.5) count++;
  return count / mask.length;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Bilinear resize of a mask (used when a model returns a mask at another size). */
export function resizeMask(src: Float32Array, width: number, height: number, newWidth: number, newHeight: number): Float32Array {
  if (src.length !== width * height || newWidth < 1 || newHeight < 1) throw new RangeError("Invalid mask size.");
  const out = new Float32Array(newWidth * newHeight);
  const sx = width / newWidth;
  const sy = height / newHeight;
  for (let y = 0; y < newHeight; y++) {
    const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), height - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, height - 1);
    const wy = fy - y0;
    for (let x = 0; x < newWidth; x++) {
      const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), width - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, width - 1);
      const wx = fx - x0;
      const top = src[y0 * width + x0]! * (1 - wx) + src[y0 * width + x1]! * wx;
      const bottom = src[y1 * width + x0]! * (1 - wx) + src[y1 * width + x1]! * wx;
      out[y * newWidth + x] = top * (1 - wy) + bottom * wy;
    }
  }
  return out;
}
