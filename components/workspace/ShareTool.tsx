"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { siteConfig } from "@/lib/site-config";

const canShareNatively = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Lets people pass the tool on (most sharing in India happens on WhatsApp).
 * Only the page address is shared — never a file — and nothing is tracked.
 */
export function ShareTool({ title, path }: { title: string; path: string }) {
  const { t } = useI18n();
  const native = useSyncExternalStore(() => () => {}, canShareNatively, () => false);
  const [copied, setCopied] = useState(false);
  const url = `${siteConfig.url}${path}`;
  const text = t.share.message(title);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-tool">
      <span className="text-sm text-fg-subtle">{t.share.prompt}</span>
      {native ? (
        <Button size="sm" variant="secondary" icon="external" onClick={() => navigator.share({ title, text, url }).catch(() => {})}>
          {t.share.native}
        </Button>
      ) : null}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-surface-muted"
      >
        <Icon name="arrowRight" className="h-4 w-4 text-success" />
        {t.share.whatsapp}
      </a>
      <Button
        size="sm"
        variant="ghost"
        icon={copied ? "check" : "file"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          } catch {
            // Clipboard may be blocked; the address bar still has the link.
          }
        }}
      >
        {copied ? t.share.copied : t.share.copy}
      </Button>
    </div>
  );
}
