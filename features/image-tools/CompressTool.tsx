"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, SelectField, TextField } from "@/components/ui/Field";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { maxKBToBytes } from "@/lib/file-processing/size-limits";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { formatBytes, formatDimensions, formatExactBytes } from "@/lib/file-processing/format";
import { processImage } from "@/lib/file-processing/image/processor";
import { useI18n } from "@/lib/i18n/client";
import { FormatHelp, FormatSelect } from "./FormatSelect";
import { ImageInputPanel } from "./ImageInputPanel";
import { ImageResult, type ImageToolResult } from "./ImageResult";
import { useImageInput } from "./useImageInput";

const PRESETS: { label: string; kb: number }[] = [
  { label: "20 KB", kb: 20 },
  { label: "50 KB", kb: 50 },
  { label: "100 KB", kb: 100 },
  { label: "200 KB", kb: 200 },
  { label: "500 KB", kb: 500 },
  { label: "1 MB", kb: 1000 },
];

type Unit = "KB" | "MB";

export function CompressTool({ initialTarget, initialUnit }: { initialTarget?: number; initialUnit?: Unit }) {
  const { t } = useI18n();
  const text = t.image.compress;
  const job = useProcessingJob<ImageToolResult & { targetBytes: number; targetLabel: string }>();
  const { reset } = job;
  const input = useImageInput(reset);
  const { image } = input;

  const [target, setTarget] = useState(String(initialTarget ?? 100));
  const [unit, setUnit] = useState<Unit>(initialUnit ?? "KB");
  const [format, setFormat] = useState<ImageFormat>("jpeg");
  const [allowResize, setAllowResize] = useState(true);

  const targetNumber = Number(target);
  const targetKB = unit === "MB" ? targetNumber * 1000 : targetNumber;
  const targetValid = Number.isFinite(targetNumber) && targetNumber > 0 && targetKB >= 1;
  const targetBytes = targetValid ? maxKBToBytes(targetKB) : 0;

  const start = () => {
    if (!image || !targetValid) return;
    void job.run(async ({ signal, message }) => {
      message(text.searching);
      const result = await processImage(
        image.file,
        {
          kind: "target-size",
          transform: { rotation: 0, output: { width: image.width, height: image.height } },
          format,
          target: { maxBytes: targetBytes },
          allowResize,
        },
        { signal, onProgress: (p) => message(text.tried(p.attempts, formatBytes(p.lastSize))) },
      );
      return { ...result, targetBytes, targetLabel: `${targetNumber} ${unit}` };
    });
  };

  const state = job.state;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <ImageInputPanel {...input} onSelect={input.select} onClear={input.clear} />
          {image ? <ImagePreview blob={image.file} alt={t.image.selectedAlt} caption={`${t.image.originalCaption} · ${formatDimensions(image.width, image.height)} · ${formatBytes(image.size)}`} /> : null}
        </div>
        <Card>
          <CardHeader title={t.common.settings} />
          <CardBody className="space-y-5">
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <TextField
                  label={t.common.maxFileSize}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="any"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    reset();
                  }}
                  error={target !== "" && !targetValid ? t.common.sizeAtLeast("1 KB") : undefined}
                />
                <SelectField label={t.common.unit} value={unit} onChange={(e) => { setUnit(e.target.value as Unit); reset(); }}>
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </SelectField>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={text.targetsLabel}>
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant="secondary"
                    aria-pressed={targetKB === preset.kb}
                    onClick={() => {
                      setTarget(preset.kb >= 1000 ? String(preset.kb / 1000) : String(preset.kb));
                      setUnit(preset.kb >= 1000 ? "MB" : "KB");
                      reset();
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {targetValid ? (
                <p className="text-xs text-fg-subtle">{text.checkedAs(formatExactBytes(targetBytes, t.format))}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <FormatSelect value={format} onChange={(f) => { setFormat(f); reset(); }} />
              <FormatHelp format={format} />
            </div>
            <Checkbox
              label={text.reduceDimensions}
              description={text.reduceDimensionsHelp}
              checked={allowResize}
              onChange={(e) => {
                setAllowResize(e.target.checked);
                reset();
              }}
            />
            {image && targetValid && image.size <= targetBytes && image.format === format ? (
              <Alert tone="success" live={false}>
                {text.alreadyUnder(formatBytes(image.size))}
              </Alert>
            ) : null}
            {format === "png" && !allowResize ? (
              <Alert tone="warning" live={false}>
                {text.pngLossless}
              </Alert>
            ) : null}
            <Button className="w-full" size="lg" onClick={start} disabled={!image || !targetValid} loading={job.running}>
              {text.button}
            </Button>
          </CardBody>
        </Card>
      </div>

      {state.status === "running" ? <ProcessingIndicator label={state.message ?? text.running} onCancel={job.cancel} /> : null}
      {state.status === "idle" && state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {state.status === "error" ? <ErrorMessage error={state.error} /> : null}
      {state.status === "success" && image ? (
        <ImageResult
          original={image}
          result={state.result}
          suffix="compressed"
          status={
            state.result.status === "met" ? (
              <Alert tone="success" title={t.common.withinLimit(formatBytes(state.result.size), state.result.targetLabel)}>
                {t.common.measured(formatExactBytes(state.result.size, t.format), formatExactBytes(state.result.targetBytes, t.format))}
                {state.result.scale < 1 ? ` ${text.reducedTo(Math.round(state.result.scale * 100))}` : ""}
              </Alert>
            ) : (
              <Alert tone="warning" title={text.missedTitle(state.result.targetLabel)}>
                {text.smallest({
                  size: formatBytes(state.result.size),
                  exact: formatExactBytes(state.result.size, t.format),
                  quality: state.result.quality !== undefined ? Math.round(state.result.quality * 100) : null,
                  scale: state.result.scale < 1 ? Math.round(state.result.scale * 100) : null,
                })}{" "}
                {allowResize ? text.lowestTried : text.allowReducing} {t.common.notMetSuffix}
              </Alert>
            )
          }
        />
      ) : null}
    </div>
  );
}
