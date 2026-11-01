import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";

/**
 * Generates PDFs whose pages have distinct widths so tests can identify page
 * order after merge/split/reorder (width = 300 + 10 × tag).
 */
export async function makePdf(tags: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const tag of tags) {
    const page = doc.addPage([pageWidthFor(tag), 400]);
    page.drawText(`Page tag ${tag}`, { x: 40, y: 200, size: 24, font });
  }
  return doc.save();
}

export function pageWidthFor(tag: number): number {
  return 300 + 10 * tag;
}

export async function pageTags(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => Math.round((page.getWidth() - 300) / 10));
}

export async function pageRotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getRotation().angle);
}

/** A PDF whose trailer declares encryption (pdf-lib refuses to load these). */
export async function makeEncryptedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 300]);
  const encrypt = doc.context.obj({
    Filter: PDFName.of("Standard"),
    V: 1,
    R: 2,
    O: PDFString.of("0123456789abcdef0123456789abcdef"),
    U: PDFString.of("0123456789abcdef0123456789abcdef"),
    P: -44,
  });
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt);
  return doc.save({ useObjectStreams: false });
}
