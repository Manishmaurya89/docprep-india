import type { Metadata } from "next";
import { ExamCustomPage, examCustomMetadata } from "@/app/_views/exam";

export const metadata: Metadata = examCustomMetadata("hi");

export default function Page() {
  return <ExamCustomPage locale="hi" />;
}
