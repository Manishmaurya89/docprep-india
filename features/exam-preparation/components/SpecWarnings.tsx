"use client";

import { Alert } from "@/components/ui/Alert";
import { useI18n } from "@/lib/i18n/client";
import type { SpecWarning } from "../spec-status";

export function SpecWarnings({ warnings }: { warnings: SpecWarning[] }) {
  const { t } = useI18n();
  if (!warnings.length) return null;
  return (
    <div className="space-y-2" data-testid="spec-warnings">
      {warnings.map((warning) => (
        <Alert key={warning.code} tone={warning.level === "danger" ? "danger" : warning.level === "warning" ? "warning" : "accent"} title={t.status.titles[warning.code]} live={false}>
          <p data-warning={warning.code}>{warning.message}</p>
        </Alert>
      ))}
    </div>
  );
}
