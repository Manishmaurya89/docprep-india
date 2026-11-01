"use client";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/client";
import { ProgressBar, Spinner } from "@/components/ui/Progress";
import type { JobProgress } from "./hooks/useProcessingJob";

export function ProcessingIndicator({
  label,
  progress,
  onCancel,
}: {
  label: string;
  progress?: JobProgress;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const text = progress ? t.common.progressLabel(progress.label ?? label, progress.done, progress.total) : label;
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
      <Spinner className="h-5 w-5 text-accent" />
      <div className="min-w-[12rem] flex-1 space-y-2">
        <p className="text-sm font-medium text-fg">{text}</p>
        {progress ? <ProgressBar value={progress.done} max={progress.total} label={label} valueText={t.common.progress(progress.done, progress.total)} /> : null}
      </div>
      {onCancel ? (
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      ) : null}
    </div>
  );
}
