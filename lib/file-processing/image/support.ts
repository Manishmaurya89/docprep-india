import type { ImageFormat } from "../detect";

let cache: Record<ImageFormat, boolean> | null = null;

/**
 * Which formats this browser's canvas can encode. Browsers that cannot encode
 * a format silently return PNG, so this is checked rather than assumed.
 */
export function getEncodeSupport(): Record<ImageFormat, boolean> {
  if (cache) return cache;
  if (typeof document === "undefined") return { jpeg: true, png: true, webp: false };
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const check = (type: string) => {
    try {
      return canvas.toDataURL(type).startsWith(`data:${type}`);
    } catch {
      return false;
    }
  };
  cache = { jpeg: check("image/jpeg"), png: true, webp: check("image/webp") };
  return cache;
}
