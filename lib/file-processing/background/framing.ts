/**
 * Where to crop a portrait once the face is known, and the live tips shown
 * while the camera is on. Pure geometry, unit-tested.
 *
 * None of this claims to meet any organisation's photo rules: "passport size"
 * here means the common 3.5 × 4.5 cm print size, and the face placement is a
 * sensible starting point the user can adjust.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type FrameShape = "passport" | "square" | "whole";

/** 3.5 × 4.5 cm at 300 DPI. */
export const PASSPORT_PIXELS: Size = { width: 413, height: 531 };
export const PASSPORT_DPI = 300;
const SQUARE_MAX = 1000;
const WHOLE_MAX = 2000;

/**
 * Height of the detected face box (roughly forehead to chin; hair adds more
 * above) as a share of the photo height: the zoom range offered, and the
 * starting value — a classic head-and-shoulders photo with a little room above
 * the hair.
 */
export const FACE_SHARE = { min: 0.24, max: 0.5, initial: 0.32 } as const;
/** The middle of the face sits this far down the photo (eyes a little above the middle, room for hair above). */
const FACE_CENTRE_FROM_TOP = 0.48;

export function shapeAspect(shape: Exclude<FrameShape, "whole">): number {
  return shape === "passport" ? PASSPORT_PIXELS.width / PASSPORT_PIXELS.height : 1;
}

/**
 * Crop (in image pixels) for a head-and-shoulders photo of `aspect`
 * (width / height) around `face`. The crop may extend past the top or sides
 * of the image — that area is filled with the new background colour — but it
 * avoids running past the bottom, where it would cut the shoulders off with a
 * hard edge: there it zooms in instead, down to a tight head shot.
 */
export function headAndShoulders(face: Box, image: Size, aspect: number, faceShare: number = FACE_SHARE.initial): Box {
  if (!(face.width > 0 && face.height > 0 && image.width > 0 && image.height > 0 && aspect > 0)) throw new RangeError("Invalid face or image size.");
  const share = Math.min(Math.max(faceShare, FACE_SHARE.min), FACE_SHARE.max);
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  let height = face.height / share;
  const room = image.height - cy;
  if (cy - FACE_CENTRE_FROM_TOP * height + height > image.height) {
    // Not enough of the body below the face: zoom in, but keep the whole face in.
    height = Math.max(room / (1 - FACE_CENTRE_FROM_TOP), face.height / FACE_SHARE.max);
  }
  const width = height * aspect;
  return { x: cx - width / 2, y: cy - FACE_CENTRE_FROM_TOP * height, width, height };
}

/** The crop for a shape: the whole image, or head and shoulders around the face (the whole image when no face was found). */
export function frameFor(shape: FrameShape, image: Size, face: Box | null, faceShare?: number): Box {
  if (shape === "whole" || !face) return { x: 0, y: 0, width: image.width, height: image.height };
  return headAndShoulders(face, image, shapeAspect(shape), faceShare);
}

/** Output pixel size and the DPI to record for a crop. Never enlarges, except passport size, which is always 413 × 531 (3.5 × 4.5 cm at 300 DPI). */
export function outputFor(shape: FrameShape, crop: Size, faceFound: boolean): Size & { dpi?: number } {
  if (shape === "passport" && faceFound) return { ...PASSPORT_PIXELS, dpi: PASSPORT_DPI };
  const max = shape === "whole" || !faceFound ? WHOLE_MAX : SQUARE_MAX;
  const scale = Math.min(1, max / Math.max(crop.width, crop.height));
  return { width: Math.max(1, Math.round(crop.width * scale)), height: Math.max(1, Math.round(crop.height * scale)) };
}

export type FramingHint = "no-face" | "one-person" | "closer" | "farther" | "centre" | "more-light" | "good";

/**
 * A tip for the live camera, from the faces found in the frame and the
 * brightness of the face (0–1). Checked in order of what matters most.
 */
export function framingHint(faces: Box[], frame: Size, faceBrightness?: number): FramingHint {
  if (faces.length === 0) return "no-face";
  if (faces.length > 1) return "one-person";
  const face = faces[0]!;
  const share = face.height / frame.height;
  if (share < 0.2) return "closer";
  if (share > 0.6) return "farther";
  const dx = (face.x + face.width / 2) / frame.width - 0.5;
  const dy = (face.y + face.height / 2) / frame.height - 0.45;
  if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.2) return "centre";
  if (faceBrightness !== undefined && faceBrightness < 0.28) return "more-light";
  return "good";
}

/** The largest face, or null. Small, distant faces in the background are ignored. */
export function mainFace(faces: Box[]): Box | null {
  let best: Box | null = null;
  for (const face of faces) if (!best || face.width * face.height > best.width * best.height) best = face;
  return best;
}

/** Faces at least a quarter the size of the largest: people who are really in the photo, not far behind. */
export function prominentFaces(faces: Box[]): Box[] {
  const main = mainFace(faces);
  if (!main) return [];
  const area = main.width * main.height;
  return faces.filter((face) => face.width * face.height >= area / 4);
}
