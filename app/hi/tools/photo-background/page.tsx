import type { Metadata } from "next";
import { PhotoBackgroundPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("photo-background", "hi");

export default function Page() {
  return <PhotoBackgroundPage locale="hi" />;
}
