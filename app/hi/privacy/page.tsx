import type { Metadata } from "next";
import { PrivacyPage, privacyMetadata } from "@/app/_views/privacy";

export const metadata: Metadata = privacyMetadata("hi");

export default function Page() {
  return <PrivacyPage locale="hi" />;
}
