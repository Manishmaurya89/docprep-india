import type { Metadata } from "next";
import { ImagesToPdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("images-to-pdf", "en");

export default function Page() {
  return <ImagesToPdfPage locale="en" />;
}
