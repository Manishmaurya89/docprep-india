"use client";

import { SegmentedControl } from "@/components/ui/Field";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { useI18n } from "@/lib/i18n/client";
import { useEncodeSupport } from "./useEncodeSupport";

const LABELS: Record<ImageFormat, string> = { jpeg: "JPEG", png: "PNG", webp: "WebP" };

export function FormatSelect({
  value,
  onChange,
  formats = ["jpeg", "png", "webp"],
  legend,
}: {
  value: ImageFormat;
  onChange: (format: ImageFormat) => void;
  formats?: ImageFormat[];
  legend?: string;
}) {
  const { t } = useI18n();
  const support = useEncodeSupport();
  const unsupported = formats.filter((format) => !support[format]);
  return (
    <SegmentedControl
      legend={legend ?? t.image.outputFormat}
      value={value}
      onChange={onChange}
      options={formats.map((format) => ({ value: format, label: LABELS[format], disabled: !support[format] }))}
      hint={unsupported.length ? t.image.unsupportedFormats(unsupported.map((f) => LABELS[f]).join(", ")) : undefined}
    />
  );
}

/** One line on when to use a format, in the page language. */
export function FormatHelp({ format }: { format: ImageFormat }) {
  const { t } = useI18n();
  return <p className="text-xs text-fg-subtle">{t.image.formatHelp[format]}</p>;
}
