"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/components/ui/cn";

export type ToolGroup = "image" | "pdf";
type Filter = "all" | ToolGroup;

export interface ToolGridItem {
  id: string;
  group: ToolGroup;
  /** The tile itself, rendered on the server. */
  tile: ReactNode;
}

/**
 * The home page's tool tiles with an "All / Image / PDF" filter. Every tile is
 * in the server HTML; the filter only hides some, so it works before scripts
 * load and search engines see every tool.
 */
export function ToolGrid({ items, labels }: { items: ToolGridItem[]; labels: Record<Filter, string> & { filter: string } }) {
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <div className="space-y-4">
      <div role="group" aria-label={labels.filter} className="flex flex-wrap justify-center gap-2">
        {(["all", "image", "pdf"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === id ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg-muted hover:border-accent/50 hover:text-fg",
            )}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <ul data-testid="tool-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} hidden={filter !== "all" && item.group !== filter}>
            {item.tile}
          </li>
        ))}
      </ul>
    </div>
  );
}
