"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { formatDimensions } from "@/lib/file-processing/format";
import { type Rect, type Rotation, centeredCropForAspect, clampRect, normalizeRotation, rotatedSize } from "@/lib/file-processing/image/geometry";
import { processImage } from "@/lib/file-processing/image/processor";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import { ASPECT_PRESETS } from "./aspect-presets";
import { CropEditor } from "./CropEditor";
import { FormatSelect } from "./FormatSelect";
import { ImageInputPanel } from "./ImageInputPanel";
import { ImageResult, type ImageToolResult } from "./ImageResult";
import { useImageInput } from "./useImageInput";
import { useI18n } from "@/lib/i18n/client";

function resolveAspect(id: string, image: InspectedImage | null, rotation: Rotation): number | null {
  const preset = ASPECT_PRESETS.find((p) => p.id === id);
  if (!preset || preset.ratio === null) return null;
  if (preset.ratio === "original") {
    if (!image) return null;
    const size = rotatedSize(image, rotation);
    return size.width / size.height;
  }
  return preset.ratio;
}

export function CropRotateTool() {
  const { t } = useI18n();
  const text = t.image.crop;
  const job = useProcessingJob<ImageToolResult>();
  const { reset } = job;
  const input = useImageInput(reset);
  const { image } = input;

  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [aspectId, setAspectId] = useState("free");
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 });
  const [format, setFormat] = useState<ImageFormat | null>(null);
  const [quality, setQuality] = useState(92);

  const oriented = image ? rotatedSize(image, rotation) : { width: 1, height: 1 };
  const aspect = resolveAspect(aspectId, image, rotation);

  // A new image starts with the full frame selected and no rotation.
  const [seenImage, setSeenImage] = useState(image);
  if (image !== seenImage) {
    setSeenImage(image);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setAspectId("free");
    if (image) setCrop({ x: 0, y: 0, width: image.width, height: image.height });
  }

  const resetCropFor = (nextRotation: Rotation, nextAspectId: string) => {
    if (!image) return;
    const size = rotatedSize(image, nextRotation);
    setCrop(centeredCropForAspect(size, resolveAspect(nextAspectId, image, nextRotation)));
  };

  const rotate = (delta: number) => {
    const next = normalizeRotation(rotation + delta);
    setRotation(next);
    resetCropFor(next, aspectId);
    reset();
  };

  const updateCrop = (next: Rect) => {
    setCrop(next);
    reset();
  };

  const setField = (key: keyof Rect, value: string) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return;
    const next = { ...crop, [key]: n };
    if (aspect !== null && key === "width") next.height = Math.round(n / aspect);
    if (aspect !== null && key === "height") next.width = Math.round(n * aspect);
    updateCrop(clampRect(next, oriented));
  };

  const resetAll = () => {
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setAspectId("free");
    if (image) setCrop({ x: 0, y: 0, width: image.width, height: image.height });
    reset();
  };

  const outputFormat = format ?? image?.format ?? "jpeg";
  const start = () => {
    if (!image) return;
    void job.run(({ signal }) =>
      processImage(
        image.file,
        {
          kind: "transform",
          transform: { rotation, flipHorizontal, flipVertical, crop, output: { width: crop.width, height: crop.height } },
          format: outputFormat,
          quality: quality / 100,
        },
        { signal },
      ),
    );
  };

  return (
    <div className="space-y-6">
      <ImageInputPanel {...input} onSelect={input.select} onClear={input.clear} />
      {image ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <CropEditor
            source={image.file}
            fullSize={image}
            rotation={rotation}
            flipHorizontal={flipHorizontal}
            flipVertical={flipVertical}
            aspect={aspect}
            crop={crop}
            onCropChange={updateCrop}
            disabled={job.running}
          />
          <Card>
            <CardHeader title={t.common.settings} actions={<Button variant="ghost" size="sm" icon="reset" onClick={resetAll}>{t.common.reset}</Button>} />
            <CardBody className="space-y-5">
              <div>
                <p className="mb-1.5 text-sm font-medium text-fg">{text.rotateFlip}</p>
                <div className="flex flex-wrap gap-2">
                  <IconButton icon="rotateCcw" label={text.rotateLeft} variant="secondary" size="md" onClick={() => rotate(-90)} />
                  <IconButton icon="rotateCw" label={text.rotateRight} variant="secondary" size="md" onClick={() => rotate(90)} />
                  <IconButton
                    icon="flipH"
                    label={text.flipHorizontal}
                    variant="secondary"
                    size="md"
                    aria-pressed={flipHorizontal}
                    onClick={() => {
                      setFlipHorizontal((v) => !v);
                      reset();
                    }}
                  />
                  <IconButton
                    icon="flipV"
                    label={text.flipVertical}
                    variant="secondary"
                    size="md"
                    aria-pressed={flipVertical}
                    onClick={() => {
                      setFlipVertical((v) => !v);
                      reset();
                    }}
                  />
                  <span className="tabular self-center text-sm text-fg-muted">{rotation}°</span>
                </div>
              </div>
              <SelectField
                label={text.aspect}
                value={aspectId}
                onChange={(e) => {
                  setAspectId(e.target.value);
                  resetCropFor(rotation, e.target.value);
                  reset();
                }}
              >
                {ASPECT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {text.aspects[preset.id] ?? preset.label}
                  </option>
                ))}
              </SelectField>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-fg">{text.area}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label={text.left} type="number" min={0} value={crop.x} onChange={(e) => setField("x", e.target.value)} />
                  <TextField label={text.top} type="number" min={0} value={crop.y} onChange={(e) => setField("y", e.target.value)} />
                  <TextField label={t.common.width} type="number" min={1} value={crop.width} onChange={(e) => setField("width", e.target.value)} />
                  <TextField label={t.common.height} type="number" min={1} value={crop.height} onChange={(e) => setField("height", e.target.value)} />
                </div>
              </fieldset>
              <FormatSelect value={outputFormat} onChange={(f) => { setFormat(f); reset(); }} />
              {outputFormat !== "png" ? (
                <Slider label={t.common.quality} value={quality} min={40} max={100} onChange={(v) => { setQuality(v); reset(); }} format={(v) => `${v}%`} />
              ) : null}
              <p className="tabular text-sm text-fg-muted">
                {text.output} <span className="font-medium text-fg">{formatDimensions(crop.width, crop.height)}</span>
              </p>
              <Button className="w-full" size="lg" onClick={start} loading={job.running}>
                {text.button}
              </Button>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {job.state.status === "running" ? <ProcessingIndicator label={text.running} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" && image ? <ImageResult original={image} result={job.state.result} suffix="cropped" /> : null}
    </div>
  );
}
