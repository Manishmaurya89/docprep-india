import type { Metadata } from "next";
import { CompressPdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("compress-pdf", "hi");

export default function Page() {
  return <CompressPdfPage locale="hi" />;
}
