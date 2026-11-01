import type { Metadata } from "next";
import type { SearchParams } from "@/lib/search-params";
import { ExamIndexPage, examMetadata } from "@/app/_views/exam";

export const metadata: Metadata = examMetadata("hi");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ExamIndexPage locale="hi" searchParams={searchParams} />;
}
