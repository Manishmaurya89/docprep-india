import type { Metadata } from "next";
import { SplitPdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("split-pdf", "hi");

export default function Page() {
  return <SplitPdfPage locale="hi" />;
}
