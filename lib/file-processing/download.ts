import { ProcessingError, detail } from "./errors";
import { sanitizeFilename } from "./filenames";

/**
 * Saves a Blob through a temporary link. No network request is involved.
 * The URL is revoked after a delay because some browsers (notably Safari)
 * start reading it asynchronously.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ProcessingError("download-failed", detail("nothingToDownload"));
  }
  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeFilename(filename);
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    throw new ProcessingError("download-failed", undefined, { cause: error });
  } finally {
    const toRevoke = url;
    if (toRevoke) window.setTimeout(() => URL.revokeObjectURL(toRevoke), 30_000);
  }
}
