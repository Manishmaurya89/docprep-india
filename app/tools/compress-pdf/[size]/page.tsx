import type { Metadata } from "next";
import { SizePage, sizeMetadata, sizeStaticParams } from "@/app/_views/tools";

type Params = Promise<{ size: string }>;

/** Only the listed sizes exist; anything else is a 404. */
export const dynamicParams = false;
export function generateStaticParams() {
  return sizeStaticParams("compress-pdf");
}

export function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return sizeMetadata("compress-pdf", { locale: "en", params });
}

export default function Page({ params }: { params: Params }) {
  return <SizePage tool="compress-pdf" locale="en" params={params} />;
}
