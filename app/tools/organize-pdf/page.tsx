import type { Metadata } from "next";
import { OrganizePdfPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("organize-pdf", "en");

export default function Page() {
  return <OrganizePdfPage locale="en" />;
}
