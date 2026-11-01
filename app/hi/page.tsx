import type { Metadata } from "next";
import { HomePage, homeMetadata } from "@/app/_views/home";

export const metadata: Metadata = homeMetadata("hi");

export default function Page() {
  return <HomePage locale="hi" />;
}
