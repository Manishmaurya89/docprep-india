"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/icons";

export function SelectedFile({
  name,
  details,
  icon = "file",
  onReplace,
  onRemove,
  disabled,
}: {
  name: string;
  details: ReactNode;
  icon?: IconName;
  onReplace?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg" title={name}>
          {name}
        </p>
        <p className="tabular text-xs text-fg-subtle">{details}</p>
      </div>
      <div className="flex gap-2">
        {onReplace ? (
          <Button variant="secondary" size="sm" onClick={onReplace} disabled={disabled}>
            {t.common.chooseAnother}
          </Button>
        ) : null}
        {onRemove ? (
          <Button variant="ghost" size="sm" icon="x" onClick={onRemove} disabled={disabled}>
            {t.common.remove}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
