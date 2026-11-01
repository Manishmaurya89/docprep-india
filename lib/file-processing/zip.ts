import { type Zippable, zipSync } from "fflate";
import { sanitizeFilename, uniqueNames } from "./filenames";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Builds a ZIP in memory. Entries are stored without recompression: JPEG,
 * PNG and PDF data is already compressed, so deflating again wastes time.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const names = uniqueNames(entries.map((entry) => sanitizeFilename(entry.name)));
  const files: Zippable = {};
  names.forEach((name, i) => {
    files[name] = [entries[i]!.data, { level: 0 }];
  });
  return zipSync(files, { level: 0 });
}
