import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export interface Stat {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasis?: boolean;
}

export function StatList({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-subtle">{stat.label}</dt>
          <dd className={cn("tabular mt-0.5 text-sm text-fg", stat.emphasis ? "font-semibold" : "font-medium")}>{stat.value}</dd>
          {stat.detail ? <dd className="tabular text-xs text-fg-subtle">{stat.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
