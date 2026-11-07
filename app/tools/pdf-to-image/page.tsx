import type { Metadata } from "next";
import { PdfToImagePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("pdf-to-image", "en");

export default function Page() {
  return <PdfToImagePage locale="en" />;
}
