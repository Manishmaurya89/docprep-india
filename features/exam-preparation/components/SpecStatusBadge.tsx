"use client";

import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/client";
import type { VerificationStatus } from "@/data/exam-requirements/schema";
import { STATUS_TONES } from "../spec-status";

export function SpecStatusBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  const icon = status === "verified" ? "check" : status === "example" || status === "unverified" ? "alert" : "info";
  return (
    <Badge tone={STATUS_TONES[status]} icon={icon} className="whitespace-normal">
      {t.status.labels[status]}
    </Badge>
  );
}
