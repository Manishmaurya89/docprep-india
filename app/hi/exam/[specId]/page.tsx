import type { Metadata } from "next";
import { ExamSpecPage, examSpecMetadata } from "@/app/_views/exam";

type Params = Promise<{ specId: string }>;

export function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return examSpecMetadata("hi", params);
}

export default function Page({ params }: { params: Params }) {
  return <ExamSpecPage locale="hi" params={params} />;
}
