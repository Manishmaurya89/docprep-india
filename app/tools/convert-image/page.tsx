import type { Metadata } from "next";
import type { SearchParams } from "@/lib/search-params";
import { ConvertImagePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("convert-image", "en");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ConvertImagePage locale="en" searchParams={searchParams} />;
}
