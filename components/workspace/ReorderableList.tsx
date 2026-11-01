"use client";

import { type ReactNode, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Progress";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/client";

export interface ListItem {
  id: string;
  name: string;
  details?: ReactNode;
  status: "checking" | "ready" | "error";
  error?: string;
  thumbnail?: ReactNode;
}

/** Ordered list with keyboard-accessible move/remove buttons and an announcement region. */
export function ReorderableList({
  items,
  onMove,
  onRemove,
  disabled,
  label,
}: {
  items: ListItem[];
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState("");
  return (
    <div>
      <ol aria-label={label} className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((item, index) => (
          <li key={item.id} className={cn("flex items-center gap-3 px-3 py-2.5", item.status === "error" && "bg-danger-soft")}>
            <span className="tabular w-6 shrink-0 text-center text-sm font-medium text-fg-subtle">{index + 1}</span>
            {item.thumbnail ?? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
                <Icon name="file" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg" title={item.name}>
                {item.name}
              </p>
              {item.status === "checking" ? (
                <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <Spinner className="h-3 w-3" /> {t.common.checking}
                </p>
              ) : item.status === "error" ? (
                <p className="text-xs font-medium text-danger">{item.error}</p>
              ) : (
                <p className="tabular text-xs text-fg-subtle">{item.details}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center">
              <IconButton
                icon="arrowUp"
                label={t.list.moveUp(item.name)}
                disabled={disabled || index === 0}
                onClick={() => {
                  onMove(item.id, -1);
                  setAnnouncement(t.list.moved(item.name, index));
                }}
              />
              <IconButton
                icon="arrowDown"
                label={t.list.moveDown(item.name)}
                disabled={disabled || index === items.length - 1}
                onClick={() => {
                  onMove(item.id, 1);
                  setAnnouncement(t.list.moved(item.name, index + 2));
                }}
              />
              <IconButton
                icon="trash"
                label={t.list.remove(item.name)}
                disabled={disabled}
                onClick={() => {
                  onRemove(item.id);
                  setAnnouncement(t.list.removed(item.name));
                }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

export function moveItem<T extends { id: string }>(items: T[], id: string, delta: -1 | 1): T[] {
  const index = items.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
