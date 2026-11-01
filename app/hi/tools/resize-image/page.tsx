import type { Metadata } from "next";
import type { SearchParams } from "@/lib/search-params";
import { ResizeImagePage, metadataFor } from "@/app/_views/tools";

export const metadata: Metadata = metadataFor("resize-image", "hi");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ResizeImagePage locale="hi" searchParams={searchParams} />;
}
