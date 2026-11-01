import type { Metadata } from "next";
import { ExamSourcesPage, examSourcesMetadata } from "@/app/_views/exam";

export const metadata: Metadata = examSourcesMetadata("en");

export default function Page() {
  return <ExamSourcesPage locale="en" />;
}
