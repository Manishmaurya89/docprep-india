"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { useI18n } from "@/lib/i18n/client";
import { type ProcessingError, errorText } from "@/lib/file-processing/errors";

export function ErrorMessage({ error, actions }: { error: ProcessingError; actions?: ReactNode }) {
  const { t } = useI18n();
  const { title, hint } = errorText(error, t.errors);
  return (
    <Alert tone="danger" title={title} actions={actions}>
      {hint ? <p>{hint}</p> : null}
    </Alert>
  );
}
