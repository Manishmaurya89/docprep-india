import type { Metadata } from "next";
import { ExamSourcesPage, examSourcesMetadata } from "@/app/_views/exam";

export const metadata: Metadata = examSourcesMetadata("hi");

export default function Page() {
  return <ExamSourcesPage locale="hi" />;
}
