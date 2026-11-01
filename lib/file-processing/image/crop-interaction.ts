import type { Rect, Size } from "./geometry";

export type CropHandle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Computes a new crop rectangle while dragging a handle by (dx, dy) source
 * pixels. Keeps the rectangle inside `bounds`, at least `minSize`, and — when
 * `aspect` is set — at exactly that aspect ratio, anchored at the opposite corner.
 */
export function adjustCrop(start: Rect, handle: CropHandle, dx: number, dy: number, bounds: Size, aspect: number | null, minSize = 8): Rect {
  const W = bounds.width;
  const H = bounds.height;
  if (handle === "move") {
    return {
      x: Math.round(Math.min(Math.max(start.x + dx, 0), W - start.width)),
      y: Math.round(Math.min(Math.max(start.y + dy, 0), H - start.height)),
      width: start.width,
      height: start.height,
    };
  }

  const hasW = handle.includes("w");
  const hasE = handle.includes("e");
  const hasN = handle.includes("n");
  const hasS = handle.includes("s");
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (hasW) left = Math.min(Math.max(left + dx, 0), right - minSize);
  if (hasE) right = Math.max(Math.min(right + dx, W), left + minSize);
  if (hasN) top = Math.min(Math.max(top + dy, 0), bottom - minSize);
  if (hasS) bottom = Math.max(Math.min(bottom + dy, H), top + minSize);

  if (aspect === null) {
    return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
  }

  // Aspect-locked: fit inside the dragged box, anchored at the fixed corner/edge.
  const anchorX = hasW ? start.x + start.width : start.x;
  const anchorY = hasN ? start.y + start.height : start.y;
  let width = right - left;
  let height = bottom - top;
  const edgeOnlyX = (hasE || hasW) && !(hasN || hasS);
  const edgeOnlyY = (hasN || hasS) && !(hasE || hasW);
  if (edgeOnlyX) height = width / aspect;
  else if (edgeOnlyY) width = height * aspect;
  else if (width / height > aspect) width = height * aspect;
  else height = width / aspect;

  const centerX = start.x + start.width / 2;
  const centerY = start.y + start.height / 2;
  const availableW = edgeOnlyY ? Math.min(centerX, W - centerX) * 2 : hasW ? anchorX : W - anchorX;
  const availableH = edgeOnlyX ? Math.min(centerY, H - centerY) * 2 : hasN ? anchorY : H - anchorY;
  if (width > availableW) {
    width = availableW;
    height = width / aspect;
  }
  if (height > availableH) {
    height = availableH;
    width = height * aspect;
  }
  if (width < minSize || height < minSize) {
    const scale = Math.max(minSize / width, minSize / height);
    width *= scale;
    height *= scale;
  }

  const x = edgeOnlyY ? centerX - width / 2 : hasW ? anchorX - width : anchorX;
  const y = edgeOnlyX ? centerY - height / 2 : hasN ? anchorY - height : anchorY;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

/** Keyboard nudges: arrows move; Shift+arrows resize from the bottom-right corner. */
export function cropFromKey(rect: Rect, key: string, shift: boolean, step: number, bounds: Size, aspect: number | null): Rect | null {
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = delta[key];
  if (!move) return null;
  return adjustCrop(rect, shift ? "se" : "move", move[0], move[1], bounds, aspect);
}
