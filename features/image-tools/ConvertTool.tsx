"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { FORMAT_LABELS, type ImageFormat } from "@/lib/file-processing/detect";
import { formatBytes, formatDimensions } from "@/lib/file-processing/format";
import { processImage } from "@/lib/file-processing/image/processor";
import { useI18n } from "@/lib/i18n/client";
import { FormatHelp, FormatSelect } from "./FormatSelect";
import { ImageInputPanel } from "./ImageInputPanel";
import { ImageResult, type ImageToolResult } from "./ImageResult";
import { useImageInput } from "./useImageInput";

const DEFAULT_TARGET: Record<ImageFormat, ImageFormat> = { jpeg: "png", png: "jpeg", webp: "jpeg" };

export function ConvertTool({ initialFormat }: { initialFormat?: ImageFormat }) {
  const { t } = useI18n();
  const text = t.image.convert;
  const job = useProcessingJob<ImageToolResult>();
  const { reset } = job;
  const input = useImageInput(reset);
  const { image } = input;
  const [format, setFormat] = useState<ImageFormat | null>(initialFormat ?? null);
  const [quality, setQuality] = useState(92);
  const [background, setBackground] = useState("#ffffff");

  const target = format ?? (image ? DEFAULT_TARGET[image.format] : "jpeg");
  const flattens = Boolean(image?.hasAlpha) && target === "jpeg";

  const start = () => {
    if (!image) return;
    void job.run(({ signal }) =>
      processImage(
        image.file,
        {
          kind: "transform",
          transform: { rotation: 0, output: { width: image.width, height: image.height }, background: flattens ? background : null },
          format: target,
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
          {image ? <ImagePreview blob={image.file} alt={t.image.selectedAlt} caption={`${FORMAT_LABELS[image.format]} · ${formatDimensions(image.width, image.height)} · ${formatBytes(image.size)}`} /> : null}
        </div>
        <Card>
          <CardHeader title={t.common.settings} />
          <CardBody className="space-y-5">
            <div className="space-y-1.5">
              <FormatSelect legend={text.to} value={target} onChange={(f) => { setFormat(f); reset(); }} />
              <FormatHelp format={target} />
            </div>
            {target !== "png" ? (
              <Slider label={t.common.quality} value={quality} min={40} max={100} onChange={(v) => { setQuality(v); reset(); }} format={(v) => `${v}%`} />
            ) : null}
            {flattens ? (
              <>
                <Alert tone="warning" live={false} title={text.transparencyTitle}>
                  {text.transparencyText}
                </Alert>
                <Field label={text.fillColour}>
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      type="color"
                      value={background}
                      onChange={(e) => {
                        setBackground(e.target.value);
                        reset();
                      }}
                      className="h-10 w-20 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
                    />
                  )}
                </Field>
              </>
            ) : null}
            {image && image.format === target ? (
              <Alert tone="info" live={false}>
                {text.already(FORMAT_LABELS[target], target === "png")}
              </Alert>
            ) : null}
            <Button className="w-full" size="lg" onClick={start} disabled={!image} loading={job.running}>
              {text.button(FORMAT_LABELS[target])}
            </Button>
          </CardBody>
        </Card>
      </div>
      {job.state.status === "running" ? <ProcessingIndicator label={text.running} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" && image ? <ImageResult original={image} result={job.state.result} suffix="" /> : null}
    </div>
  );
}
