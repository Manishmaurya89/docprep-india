"use client";

import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { type Stat, StatList } from "@/components/workspace/StatList";
import { formatBytes, formatExactBytes, formatReduction } from "@/lib/file-processing/format";
import { useI18n } from "@/lib/i18n/client";

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function PdfResult({
  bytes,
  pageCount,
  filename,
  originalSize,
  title,
  children,
  extraStats = [],
}: {
  bytes: Uint8Array;
  pageCount: number;
  filename: string;
  originalSize?: number;
  title?: string;
  children?: ReactNode;
  extraStats?: Stat[];
}) {
  const { t } = useI18n();
  const text = t.pdf.result;
  const stats: Stat[] = [
    { label: t.common.pages, value: pageCount },
    { label: text.outputSize, value: formatBytes(bytes.length), detail: formatExactBytes(bytes.length, t.format), emphasis: true },
    ...(originalSize !== undefined
      ? [
          { label: text.originalSize, value: formatBytes(originalSize), detail: formatExactBytes(originalSize, t.format) },
          { label: text.change, value: formatReduction(originalSize, bytes.length, t.format) },
        ]
      : []),
    ...extraStats,
  ];
  return (
    <Card data-testid="pdf-result" data-page-count={pageCount} data-output-size={bytes.length}>
      <CardHeader title={title ?? t.common.result} actions={<DownloadButton blob={pdfBlob(bytes)} filename={filename} label={text.download} />} />
      <CardBody className="space-y-4">
        <StatList stats={stats} />
        {children}
      </CardBody>
    </Card>
  );
}
