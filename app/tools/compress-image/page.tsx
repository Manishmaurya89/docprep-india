import type { Metadata } from "next";
import type { SearchParams } from "@/lib/search-params";
import { CompressImagePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("compress-image", "en");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <CompressImagePage locale="en" searchParams={searchParams} />;
}
