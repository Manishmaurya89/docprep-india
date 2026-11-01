import type { Metadata } from "next";
import { PrivacyPage, privacyMetadata } from "@/app/_views/privacy";

export const metadata: Metadata = privacyMetadata("en");

export default function Page() {
  return <PrivacyPage locale="en" />;
}
