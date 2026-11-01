import Link from "next/link";
import { ToolArt } from "@/components/illustrations/ToolArt";
import type { ToolDefinition } from "@/lib/tools/registry";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      href={tool.href}
      className="lift group flex h-full items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50"
    >
      <ToolArt icon={tool.icon} className="h-16 w-24 shrink-0" />
      <span className="min-w-0">
        <span className="block font-medium text-fg group-hover:text-accent">{tool.title}</span>
        <span className="mt-0.5 block text-sm text-fg-muted">{tool.summary}</span>
        <span className="mt-1.5 block text-xs text-fg-subtle">{tool.accepts.join(", ")}</span>
      </span>
    </Link>
  );
}
