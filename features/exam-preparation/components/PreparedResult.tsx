"use client";

import type { ReactNode } from "react";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { type Stat, StatList } from "@/components/workspace/StatList";
import { FORMAT_LABELS } from "@/lib/file-processing/detect";
import { formatBytes, formatDimensions, formatExactBytes } from "@/lib/file-processing/format";
import type { PreparedFile } from "../prepare-image";
import { ValidationChecklist } from "./ValidationChecklist";
import { useI18n } from "@/lib/i18n/client";

export function PreparedResult({ prepared, preview }: { prepared: PreparedFile; preview?: ReactNode }) {
  const { t } = useI18n();
  const e = t.exam;
  const { measured } = prepared;
  const stats: Stat[] = [
    { label: e.formatFromContent, value: FORMAT_LABELS[measured.format] },
    { label: e.fileSize, value: formatBytes(measured.size), detail: formatExactBytes(measured.size, t.format), emphasis: true },
    measured.width !== undefined && measured.height !== undefined
      ? { label: e.dimensions, value: formatDimensions(measured.width, measured.height) }
      : { label: t.common.pages, value: measured.pageCount ?? "—" },
    { label: e.fileName, value: prepared.filename },
  ];
  return (
    <div className="space-y-4 border-t border-border pt-4" data-testid="prepared-result" data-size={measured.size} data-width={measured.width} data-height={measured.height}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-fg">{e.preparedFile}</h4>
        <DownloadButton blob={prepared.blob} filename={prepared.filename} label={e.downloadFile(prepared.filename)} />
      </div>
      <StatList stats={stats} />
      {prepared.notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {prepared.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
        {preview ? <div>{preview}</div> : null}
        <ValidationChecklist findings={prepared.findings} />
      </div>
    </div>
  );
}
