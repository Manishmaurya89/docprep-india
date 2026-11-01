"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl, SelectField, TextField } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { outputName } from "@/lib/file-processing/filenames";
import { formatBytes, formatExactBytes } from "@/lib/file-processing/format";
import { maxKBToBytes } from "@/lib/file-processing/size-limits";
import { PdfInputPanel } from "./PdfInputPanel";
import { PdfResult } from "./PdfResult";
import { usePdfInput } from "./usePdfInput";
import { useI18n } from "@/lib/i18n/client";

type Level = "basic" | "recommended" | "strong" | "rasterize";

const LEVELS: Level[] = ["basic", "recommended", "strong", "rasterize"];

type Goal = "size" | "level";
const SIZE_PRESETS = [100, 200, 300, 500, 1000, 2000];

export interface CompressPdfOutcome {
  bytes: Uint8Array;
  pageCount: number;
  level: Level | "target";
  target?: { label: string; bytes: number; met: boolean; rasterized: boolean; notes: string[] };
  imagesFound?: number;
  imagesRecompressed?: number;
  imagesSkipped?: number;
}

export function CompressPdfTool({ initialTargetKB }: { initialTargetKB?: number }) {
  const { t } = useI18n();
  const text = t.pdf.compress;
  const job = useProcessingJob<CompressPdfOutcome>();
  const { reset } = job;
  const input = usePdfInput(reset);
  const { pdf } = input;
  const [goal, setGoal] = useState<Goal>(initialTargetKB ? "size" : "level");
  const [level, setLevel] = useState<Level>("recommended");
  const [target, setTarget] = useState(String(initialTargetKB && initialTargetKB >= 1000 ? initialTargetKB / 1000 : (initialTargetKB ?? 200)));
  const [unit, setUnit] = useState<"KB" | "MB">(initialTargetKB && initialTargetKB >= 1000 ? "MB" : "KB");
  const targetNumber = Number(target);
  const targetKB = unit === "MB" ? targetNumber * 1000 : targetNumber;
  const targetValid = Number.isFinite(targetNumber) && targetNumber > 0 && targetKB >= 10;

  const start = () => {
    if (!pdf) return;
    void job.run(async ({ signal, progress, message }) => {
      if (goal === "size") {
        const maxBytes = maxKBToBytes(targetKB);
        const [{ compressPdfToTarget }, { ImageWorkerSession }, { getPdfPageCount }] = await Promise.all([
          import("@/lib/file-processing/pdf/compress-to-target"),
          import("@/lib/file-processing/image/processor"),
          import("@/lib/file-processing/pdf/operations"),
        ]);
        const session = new ImageWorkerSession();
        try {
          const result = await compressPdfToTarget(pdf.bytes, maxBytes, {
            reencodeJpeg: (request) => session.reencodeJpeg(request, { signal }),
            signal,
            onMessage: message,
            text: t.pdfTarget,
          });
          return {
            bytes: result.bytes,
            pageCount: await getPdfPageCount(result.bytes),
            level: "target" as const,
            target: { label: `${targetNumber} ${unit}`, bytes: maxBytes, met: result.met, rasterized: result.rasterized, notes: result.notes },
          };
        } finally {
          session.dispose();
        }
      }
      if (level === "rasterize") {
        const { rasterizePdf } = await import("@/lib/file-processing/pdf/rasterize");
        const result = await rasterizePdf(pdf.bytes, { dpi: 110, quality: 0.6, signal, onProgress: (done, total) => progress({ done, total, label: text.renderingPages }) });
        return { ...result, level };
      }
      const [{ compressPdf }, { ImageWorkerSession }] = await Promise.all([
        import("@/lib/file-processing/pdf/compress"),
        import("@/lib/file-processing/image/processor"),
      ]);
      const session = new ImageWorkerSession();
      try {
        const result = await compressPdf(pdf.bytes, {
          recompressImages: level !== "basic",
          imageQuality: level === "strong" ? 0.5 : 0.7,
          maxImageDimension: level === "strong" ? 1400 : 2000,
          reencodeJpeg: (request) => session.reencodeJpeg(request, { signal }),
          signal,
          onProgress: (done, total) => progress({ done, total, label: text.recompressing }),
        });
        return { ...result, level };
      } finally {
        session.dispose();
      }
    });
  };

  const state = job.state;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <PdfInputPanel {...input} onSelect={input.select} onClear={input.clear} />
        <Card>
          <CardHeader title={text.howSmall} />
          <CardBody className="space-y-4">
            <SegmentedControl
              legend={text.goal}
              value={goal}
              onChange={(value) => {
                setGoal(value);
                reset();
              }}
              options={[
                { value: "size", label: text.underLimit },
                { value: "level", label: text.chooseLevel },
              ]}
            />
            {goal === "size" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_6rem] gap-3">
                  <TextField
                    label={t.common.maxFileSize}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      reset();
                    }}
                    error={target !== "" && !targetValid ? t.common.sizeAtLeast("10 KB") : undefined}
                  />
                  <SelectField label={t.common.unit} value={unit} onChange={(e) => { setUnit(e.target.value as "KB" | "MB"); reset(); }}>
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </SelectField>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={text.limitsLabel}>
                  {SIZE_PRESETS.map((kb) => (
                    <Button
                      key={kb}
                      size="sm"
                      variant="secondary"
                      aria-pressed={targetKB === kb}
                      onClick={() => {
                        setTarget(kb >= 1000 ? String(kb / 1000) : String(kb));
                        setUnit(kb >= 1000 ? "MB" : "KB");
                        reset();
                      }}
                    >
                      {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-fg-subtle">{text.gentleFirst}</p>
              </div>
            ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">{text.levelLegend}</legend>
              {LEVELS.map((id) => ({ id, ...text.levels[id] })).map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3 focus-within:outline-2 focus-within:outline-focus",
                    level === option.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="pdf-level"
                    value={option.id}
                    checked={level === option.id}
                    onChange={() => {
                      setLevel(option.id);
                      reset();
                    }}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-fg">{option.title}</span>
                    <span className="block text-xs text-fg-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            )}
            {goal === "level" && level === "rasterize" ? (
              <Alert tone="warning" live={false}>
                {text.rasterizeWarning}
              </Alert>
            ) : null}
            <Button className="w-full" size="lg" onClick={start} disabled={!pdf || (goal === "size" && !targetValid)} loading={job.running}>
              {text.button}
            </Button>
          </CardBody>
        </Card>
      </div>

      {state.status === "running" ? <ProcessingIndicator label={state.message ?? text.running} progress={state.progress} onCancel={job.cancel} /> : null}
      {state.status === "idle" && state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {state.status === "error" ? <ErrorMessage error={state.error} /> : null}
      {state.status === "success" && pdf ? (
        <PdfResult
          bytes={state.result.bytes}
          pageCount={state.result.pageCount}
          filename={outputName(pdf.file.name, "compressed", "pdf")}
          originalSize={pdf.size}
          extraStats={
            state.result.imagesFound !== undefined
              ? [{ label: text.imagesRecompressed, value: t.common.progress(state.result.imagesRecompressed ?? 0, state.result.imagesFound) }]
              : []
          }
        >
          {state.result.target ? (
            state.result.target.met ? (
              <Alert tone="success" title={t.common.withinLimit(formatBytes(state.result.bytes.length), state.result.target.label)}>
                {t.common.measured(formatExactBytes(state.result.bytes.length, t.format), formatExactBytes(state.result.target.bytes, t.format))}{" "}
                {state.result.target.notes.join(" ")} {text.checkPages}
              </Alert>
            ) : (
              <Alert tone="warning" title={text.missedTitle(state.result.target.label)}>
                {state.result.target.notes.join(" ")} {t.common.notMetSuffix}
              </Alert>
            )
          ) : state.result.bytes.length >= pdf.size ? (
            <Alert tone="warning" title={text.noReduction}>
              {text.notSmaller(formatBytes(state.result.bytes.length), formatBytes(pdf.size))}{" "}
              {state.result.level === "rasterize" ? text.alreadyCompact : text.cannotRecompress}
            </Alert>
          ) : (
            <Alert tone="success" title={text.reducedTitle(formatBytes(state.result.bytes.length))}>
              {text.reducedText}
            </Alert>
          )}
          {state.result.imagesSkipped ? (
            <p className="text-xs text-fg-subtle">{text.skipped(state.result.imagesSkipped)}</p>
          ) : null}
        </PdfResult>
      ) : null}
    </div>
  );
}
