import type { Metadata } from "next";
import { ExtractPagesPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("extract-pdf-pages", "hi");

export default function Page() {
  return <ExtractPagesPage locale="hi" />;
}
