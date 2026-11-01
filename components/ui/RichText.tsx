import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { type Locale, localizePath } from "@/lib/i18n/config";

/** `[label](/path)` links, `**bold**` and `` `code` `` — the only markup dictionary text may use. */
const TOKEN = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

/**
 * Renders a dictionary string with its links pointing at pages in `locale`.
 * Text is never parsed as HTML.
 */
export function RichText({ text, locale, linkClassName = "text-accent underline" }: { text: string; locale: Locale; linkClassName?: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [, label, href, bold, code] = match;
    if (label && href) {
      parts.push(
        <Link key={index} href={localizePath(href, locale)} className={linkClassName}>
          {label}
        </Link>,
      );
    } else if (bold) {
      parts.push(
        <strong key={index} className="text-fg">
          {bold}
        </strong>,
      );
    } else if (code) {
      parts.push(
        <code key={index} className="font-mono text-xs">
          {code}
        </code>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
