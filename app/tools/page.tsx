import type { Metadata } from "next";
import { ToolsIndexPage, toolsIndexMetadata } from "@/app/_views/tools";

export const metadata: Metadata = toolsIndexMetadata("en");

export default function Page() {
  return <ToolsIndexPage locale="en" />;
}
