/** Background colours offered by the photo background tool. Names are in the dictionaries (`photoBackground.colors`). */
export const BACKGROUND_COLORS = [
  { id: "white", hex: "#ffffff" },
  { id: "offWhite", hex: "#f2f2f0" },
  { id: "lightBlue", hex: "#dbeafe" },
  { id: "blue", hex: "#2f6fdb" },
  { id: "red", hex: "#d62828" },
] as const;

export type BackgroundColorId = (typeof BACKGROUND_COLORS)[number]["id"];

/** "#abc" or "#aabbcc" (any case) → "#aabbcc"; anything else → null. */
export function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1]!.toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normal = normalizeHex(hex);
  if (!normal) throw new RangeError(`Not a colour: ${hex}`);
  const n = Number.parseInt(normal.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export type CameraProblem = "denied" | "no-camera" | "busy" | "insecure" | "unsupported" | "other";

/** What went wrong when opening the camera, from the error getUserMedia threw. */
export function cameraProblem(error: unknown): CameraProblem {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no-camera";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    case "SecurityError":
      return "insecure";
    case "TypeError":
      return "unsupported";
    default:
      return "other";
  }
}
