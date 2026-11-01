"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { type Stat, StatList } from "@/components/workspace/StatList";
import { EXTENSIONS, FORMAT_LABELS } from "@/lib/file-processing/detect";
import { outputName } from "@/lib/file-processing/filenames";
import { formatBytes, formatDimensions, formatExactBytes, formatReduction } from "@/lib/file-processing/format";
import { renderDetail } from "@/lib/file-processing/errors";
import type { ImageJobResult, ImageWarning } from "@/lib/file-processing/image/jobs";
import type { Engine, FallbackReason } from "@/lib/file-processing/image/processor";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import type { UiMessages } from "@/lib/i18n/en";
import { useI18n } from "@/lib/i18n/client";

export type ImageToolResult = ImageJobResult & { engine: Engine; fallbackReason?: FallbackReason | null };

function warningText(warning: ImageWarning, t: UiMessages): string {
  switch (warning.code) {
    case "transparency-flattened":
      return t.image.result.flattened;
    case "decoded-at-reduced-size":
      return t.image.result.decodedReduced(Math.round(warning.scale * 100));
    case "upscaled":
      return t.image.result.upscaled;
  }
}

/**
 * Before/after preview, measured statistics and the download. Every number
 * here comes from the produced file itself.
 */
export function ImageResult({
  original,
  result,
  suffix,
  title,
  status,
  extraStats = [],
  children,
}: {
  original: InspectedImage;
  result: ImageToolResult;
  suffix: string;
  title?: string;
  status?: ReactNode;
  extraStats?: Stat[];
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const text = t.image.result;
  const filename = outputName(original.file.name, suffix, EXTENSIONS[result.format]);
  const stats: Stat[] = [
    { label: text.original, value: formatBytes(original.size), detail: formatDimensions(original.width, original.height) },
    { label: text.output, value: formatBytes(result.size), detail: formatExactBytes(result.size, t.format), emphasis: true },
    { label: text.outputDimensions, value: formatDimensions(result.width, result.height), detail: FORMAT_LABELS[result.format] },
    {
      label: text.change,
      value: formatReduction(original.size, result.size, t.format),
      detail: result.quality !== undefined ? text.quality(Math.round(result.quality * 100)) : text.lossless,
    },
    ...extraStats,
  ];
  return (
    <Card data-testid="image-result" data-engine={result.engine} data-output-size={result.size} data-output-width={result.width} data-output-height={result.height}>
      <CardHeader title={title ?? t.common.result} actions={<DownloadButton blob={result.blob} filename={filename} label={text.downloadAs(EXTENSIONS[result.format].toUpperCase())} />} />
      <CardBody className="space-y-4">
        {status}
        <StatList stats={stats} />
        {result.warnings.map((warning) => (
          <Alert key={warning.code} tone="warning" live={false}>
            {warningText(warning, t)}
          </Alert>
        ))}
        {children}
        <div className="grid gap-4 sm:grid-cols-2">
          <ImagePreview blob={original.file} alt={text.originalAlt} caption={`${text.before} · ${formatDimensions(original.width, original.height)} · ${formatBytes(original.size)}`} />
          <ImagePreview blob={result.blob} alt={text.processedAlt} caption={`${text.after} · ${formatDimensions(result.width, result.height)} · ${formatBytes(result.size)}`} />
        </div>
        <p className="text-xs text-fg-subtle">
          {text.savedAs(filename)} {text.metadata}
          {result.engine === "main-thread"
            ? ` ${text.mainThread(result.fallbackReason ? renderDetail({ key: result.fallbackReason }, t.errors) : null)}`
            : ""}
        </p>
      </CardBody>
    </Card>
  );
}
