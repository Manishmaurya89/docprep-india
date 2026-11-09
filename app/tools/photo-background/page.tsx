import type { Metadata } from "next";
import { PhotoBackgroundPage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("photo-background", "en");

export default function Page() {
  return <PhotoBackgroundPage locale="en" />;
}
