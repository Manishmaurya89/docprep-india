"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, SegmentedControl, TextField } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { ProcessingError } from "@/lib/file-processing/errors";
import { formatDimensions } from "@/lib/file-processing/format";
import { computeResize } from "@/lib/file-processing/image/geometry";
import { processImage } from "@/lib/file-processing/image/processor";
import { FormatSelect } from "./FormatSelect";
import { ImageInputPanel } from "./ImageInputPanel";
import { ImageResult, type ImageToolResult } from "./ImageResult";
import { useImageInput } from "./useImageInput";
import { useI18n } from "@/lib/i18n/client";
import { errorText } from "@/lib/file-processing/errors";

type Mode = "pixels" | "percent";

export function ResizeTool({ initialWidth, initialHeight }: { initialWidth?: number; initialHeight?: number }) {
  const { t } = useI18n();
  const text = t.image.resize;
  const job = useProcessingJob<ImageToolResult>();
  const { reset } = job;
  const input = useImageInput(reset);
  const { image } = input;

  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState(initialWidth ? String(initialWidth) : "");
  const [height, setHeight] = useState(initialHeight ? String(initialHeight) : "");
  const [anchor, setAnchor] = useState<"width" | "height">("width");
  const [lockAspect, setLockAspect] = useState(!(initialWidth && initialHeight));
  const [percent, setPercent] = useState(50);
  const [allowUpscale, setAllowUpscale] = useState(false);
  const [format, setFormat] = useState<ImageFormat | null>(null);
  const [quality, setQuality] = useState(90);

  const outputFormat = format ?? image?.format ?? "jpeg";

  // Prefill the fields with the image's own size the first time one is chosen.
  const [seenImage, setSeenImage] = useState(image);
  if (image !== seenImage) {
    setSeenImage(image);
    if (image && width === "" && height === "") {
      setWidth(String(image.width));
      setHeight(String(image.height));
    }
  }

  const plan = useMemo(() => {
    if (!image) return null;
    try {
      return {
        ok: true as const,
        value: computeResize({
          source: image,
          mode,
          width: width === "" ? undefined : Number(width),
          height: height === "" ? undefined : Number(height),
          anchor,
          percent,
          lockAspect,
          allowUpscale,
        }),
      };
    } catch (error) {
      return { ok: false as const, error: error instanceof ProcessingError ? errorText(error, t.errors).title : text.invalid };
    }
  }, [image, mode, width, height, anchor, percent, lockAspect, allowUpscale, t, text]);

  const onWidth = (value: string) => {
    setWidth(value);
    setAnchor("width");
    const n = Number(value);
    if (lockAspect && image && n > 0) setHeight(String(Math.max(1, Math.round((n * image.height) / image.width))));
    reset();
  };
  const onHeight = (value: string) => {
    setHeight(value);
    setAnchor("height");
    const n = Number(value);
    if (lockAspect && image && n > 0) setWidth(String(Math.max(1, Math.round((n * image.width) / image.height))));
    reset();
  };

  const start = () => {
    if (!image || !plan?.ok) return;
    const size = plan.value;
    void job.run(({ signal }) =>
      processImage(
        image.file,
        {
          kind: "transform",
          transform: { rotation: 0, output: { width: size.width, height: size.height } },
          format: outputFormat,
          quality: quality / 100,
        },
        { signal },
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <ImageInputPanel {...input} onSelect={input.select} onClear={input.clear} />
          {image ? <ImagePreview blob={image.file} alt={t.image.selectedAlt} caption={`${t.image.originalCaption} · ${formatDimensions(image.width, image.height)}`} /> : null}
        </div>
        <Card>
          <CardHeader title={t.common.settings} />
          <CardBody className="space-y-5">
            <SegmentedControl
              legend={text.by}
              value={mode}
              onChange={(value) => {
                setMode(value);
                reset();
              }}
              options={[
                { value: "pixels", label: text.pixels },
                { value: "percent", label: text.percentage },
              ]}
            />
            {mode === "pixels" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label={t.common.width} type="number" inputMode="numeric" min={1} suffix="px" value={width} onChange={(e) => onWidth(e.target.value)} />
                  <TextField label={t.common.height} type="number" inputMode="numeric" min={1} suffix="px" value={height} onChange={(e) => onHeight(e.target.value)} />
                </div>
                <Checkbox
                  label={text.keepAspect}
                  description={text.keepAspectHelp}
                  checked={lockAspect}
                  onChange={(e) => {
                    setLockAspect(e.target.checked);
                    reset();
                  }}
                />
              </>
            ) : (
              <Slider label={text.scale} value={percent} min={1} max={200} onChange={(v) => { setPercent(v); reset(); }} format={(v) => `${v}%`} />
            )}
            <Checkbox
              label={text.allowEnlarging}
              description={text.allowEnlargingHelp}
              checked={allowUpscale}
              onChange={(e) => {
                setAllowUpscale(e.target.checked);
                reset();
              }}
            />
            <FormatSelect value={outputFormat} onChange={(f) => { setFormat(f); reset(); }} />
            {outputFormat !== "png" ? (
              <Slider label={t.common.quality} value={quality} min={40} max={100} onChange={(v) => { setQuality(v); reset(); }} format={(v) => `${v}%`} />
            ) : null}

            {image && plan ? (
              plan.ok ? (
                <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm" aria-live="polite">
                  <span className="text-fg-subtle">{text.result} </span>
                  <span className="tabular font-medium text-fg" data-testid="resize-preview-dimensions">
                    {formatDimensions(plan.value.width, plan.value.height)}
                  </span>
                  {plan.value.upscaleBlocked ? (
                    <p className="mt-1 text-xs text-warning">{text.upscaleBlocked}</p>
                  ) : null}
                  {!lockAspect && mode === "pixels" && Math.abs(plan.value.width / plan.value.height - image.width / image.height) > 0.01 ? (
                    <p className="mt-1 text-xs text-warning">{text.stretched}</p>
                  ) : null}
                </div>
              ) : (
                <Alert tone="danger">{plan.error}</Alert>
              )
            ) : null}

            <Button className="w-full" size="lg" onClick={start} disabled={!image || !plan?.ok} loading={job.running}>
              {text.button}
            </Button>
          </CardBody>
        </Card>
      </div>

      {job.state.status === "running" ? <ProcessingIndicator label={text.running} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" && image ? <ImageResult original={image} result={job.state.result} suffix={`${job.state.result.width}x${job.state.result.height}`} /> : null}
    </div>
  );
}
