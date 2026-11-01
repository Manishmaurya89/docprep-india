"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { localizedTools } from "@/lib/tools/localize";
import { searchTools } from "@/lib/tools/registry";
import { ToolIcon } from "./ToolIcon";

/** Filters the tool catalogue as you type. Press "/" anywhere on the page to focus it. */
export function ToolSearch({ autoFocusShortcut = true, size = "lg" }: { autoFocusShortcut?: boolean; size?: "md" | "lg" }) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const tools = useMemo(() => localizedTools(t, locale), [t, locale]);
  const results = useMemo(() => (query.trim() ? searchTools(query, tools).slice(0, 8) : []), [query, tools]);

  useEffect(() => {
    if (!autoFocusShortcut) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [autoFocusShortcut]);

  return (
    <div className="relative" role="search">
      <label htmlFor={id} className="sr-only">
        {t.search.label}
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.search.placeholder}
          autoComplete="off"
          aria-describedby={`${id}-status`}
          className={cn(
            "block w-full rounded-lg border border-border-strong bg-surface pr-12 pl-11 text-fg shadow-card placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
            size === "lg" ? "h-13 text-base" : "h-10 text-sm",
          )}
        />
        {autoFocusShortcut ? (
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-fg-subtle sm:block">
            /
          </kbd>
        ) : null}
      </div>
      <p id={`${id}-status`} aria-live="polite" className="sr-only">
        {query.trim() ? t.search.found(results.length) : ""}
      </p>
      {query.trim() ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted">{t.search.noMatch(query)}</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((tool) => (
                <li key={tool.slug}>
                  <Link href={tool.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted focus-visible:bg-surface-muted">
                    <ToolIcon icon={tool.icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{tool.title}</span>
                      <span className="block truncate text-xs text-fg-subtle">{tool.summary}</span>
                    </span>
                    <span className="hidden text-xs text-fg-subtle sm:block">{t.categories[tool.category]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
