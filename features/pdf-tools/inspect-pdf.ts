import { toProcessingError } from "@/lib/file-processing/errors";
import { assertPdfFile } from "@/lib/file-processing/inspect";

export interface InspectedPdf {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number;
  size: number;
}

let counter = 0;

/** Reads and validates a PDF locally. pdf-lib is loaded only when needed. */
export async function inspectPdf(file: File): Promise<InspectedPdf> {
  await assertPdfFile(file);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    throw toProcessingError(error);
  }
  const { loadPdf } = await import("@/lib/file-processing/pdf/operations");
  const doc = await loadPdf(bytes, file.name);
  return { id: `pdf-${++counter}`, file, bytes, pageCount: doc.getPageCount(), size: file.size };
}

export const PDF_ACCEPT = "application/pdf,.pdf";
