import type { Metadata } from "next";
import { SplitPdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("split-pdf", "en");

export default function Page() {
  return <SplitPdfPage locale="en" />;
}
