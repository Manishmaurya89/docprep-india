import type { Metadata } from "next";
import { MergePdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("merge-pdf", "en");

export default function Page() {
  return <MergePdfPage locale="en" />;
}
