import type { Metadata } from "next";
import { CropRotatePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("crop-rotate-image", "en");

export default function Page() {
  return <CropRotatePage locale="en" />;
}
