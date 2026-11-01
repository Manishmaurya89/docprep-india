import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { prepareImageForPdf } from "@/features/pdf-tools/prepare-images";
import { detectFormat } from "@/lib/file-processing/detect";
import { ProcessingError, detail } from "@/lib/file-processing/errors";
import type { Rotation } from "@/lib/file-processing/image/geometry";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import type { PreparedFile } from "./prepare-image";
import { sizeTarget } from "./prepare-image";
import { isA4, validateAgainstRequirement } from "./validate";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export type PdfSource =
  | { kind: "pdf"; bytes: Uint8Array; name: string }
  | { kind: "images"; pages: { id: string; image: InspectedImage; rotation: Rotation }[] };

/** Page setup for documents built from photos; shared with the on-screen page preview. */
export const CERTIFICATE_PAGE_LAYOUT = { pageSize: "a4", orientation: "auto", margin: 18 } as const;

export async function preparePdfDocument(
  source: PdfSource,
  requirement: DocumentRequirement,
  options: { signal?: AbortSignal; onMessage?: (message: string) => void; t?: UiMessages } = {},
): Promise<PreparedFile> {
  const t = options.t ?? enUi;
  if (requirement.kind !== "pdf") throw new ProcessingError("spec-invalid", detail("notPdfRequirement"));
  const { signal, onMessage } = options;
  const ops = await import("@/lib/file-processing/pdf/operations");
  const notes: string[] = [];
  let bytes: Uint8Array;

  if (source.kind === "images") {
    if (source.pages.length === 0) throw new ProcessingError("no-file");
    onMessage?.(t.prepare.creatingA4);
    const prepared = [];
    for (const page of source.pages) prepared.push(await prepareImageForPdf(page.image, signal, page.rotation));
    bytes = (await ops.imagesToPdf(prepared, { ...CERTIFICATE_PAGE_LAYOUT, signal })).bytes;
    notes.push(t.prepare.createdA4(source.pages.length));
  } else {
    bytes = source.bytes;
  }

  if (requirement.pageSize === "a4") {
    const sizes = await ops.getPageSizes(bytes);
    if (!sizes.every(isA4)) {
      onMessage?.(t.prepare.placingA4);
      bytes = (await ops.fitPagesToA4(bytes)).bytes;
      notes.push(t.prepare.placedA4);
    }
  }

  const target = sizeTarget(requirement);
  if (target && bytes.length > target.maxBytes) {
    const [{ compressPdfToTarget }, { ImageWorkerSession }] = await Promise.all([
      import("@/lib/file-processing/pdf/compress-to-target"),
      import("@/lib/file-processing/image/processor"),
    ]);
    const session = new ImageWorkerSession();
    try {
      const result = await compressPdfToTarget(bytes, target.maxBytes, {
        reencodeJpeg: (request) => session.reencodeJpeg(request, { signal }),
        signal,
        onMessage,
        text: t.pdfTarget,
      });
      notes.push(...result.notes);
      bytes = result.bytes;
    } finally {
      session.dispose();
    }
  }

  const pageSizes = await ops.getPageSizes(bytes);
  const measured = { format: detectFormat(bytes.subarray(0, 1024)), size: bytes.length, pageCount: pageSizes.length, pageSizesPt: pageSizes };
  return {
    blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    filename: `${requirement.id}.pdf`,
    measured,
    findings: validateAgainstRequirement(measured, requirement, t),
    notes,
  };
}
