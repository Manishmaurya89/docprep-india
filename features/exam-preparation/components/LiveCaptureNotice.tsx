"use client";

import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";

export function LiveCaptureNotice({ requirement }: { requirement: DocumentRequirement }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div className="space-y-1">
        <p className="font-medium text-fg">{t.exam.liveTitle}</p>
        <p className="text-fg-muted">{t.exam.liveText(requirement.conditions.length > 0)}</p>
      </div>
    </div>
  );
}
