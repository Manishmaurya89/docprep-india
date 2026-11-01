import type { Metadata } from "next";
import { ImagesToPdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("images-to-pdf", "hi");

export default function Page() {
  return <ImagesToPdfPage locale="hi" />;
}
