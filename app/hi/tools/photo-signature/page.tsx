import type { Metadata } from "next";
import type { SearchParams } from "@/lib/search-params";
import { PhotoSignaturePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("photo-signature", "hi");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PhotoSignaturePage locale="hi" searchParams={searchParams} />;
}
