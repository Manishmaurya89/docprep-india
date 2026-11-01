const RESERVED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const MAX_BASE_LENGTH = 80;

/** Strips path components and characters that are unsafe in filenames on any OS. */
export function sanitizeFilename(name: string, fallback = "file"): string {
  const lastSegment = name.split(/[/\\]/).pop() ?? "";
  const cleaned = lastSegment.replace(RESERVED, "").replace(/\s+/g, " ").replace(/^[.\s]+|[.\s]+$/g, "");
  if (!cleaned) return fallback;
  const dot = cleaned.lastIndexOf(".");
  if (dot > 0 && cleaned.length - dot <= 6) {
    const base = cleaned.slice(0, dot).slice(0, MAX_BASE_LENGTH).trim() || fallback;
    return `${base}${cleaned.slice(dot).toLowerCase()}`;
  }
  return cleaned.slice(0, MAX_BASE_LENGTH).trim() || fallback;
}

export function baseName(name: string): string {
  const safe = sanitizeFilename(name);
  const dot = safe.lastIndexOf(".");
  return dot > 0 ? safe.slice(0, dot) : safe;
}

/** e.g. outputName("IMG 1.jpeg", "resized", "webp") → "IMG 1-resized.webp" */
export function outputName(original: string, suffix: string, extension: string): string {
  const base = baseName(original);
  return `${base}${suffix ? `-${suffix}` : ""}.${extension.replace(/^\./, "")}`;
}

/** Makes names unique within a set: a.jpg, a (2).jpg, a (3).jpg … */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    const unique = dot > 0 ? `${name.slice(0, dot)} (${count + 1})${name.slice(dot)}` : `${name} (${count + 1})`;
    seen.set(unique.toLowerCase(), 1);
    return unique;
  });
}
