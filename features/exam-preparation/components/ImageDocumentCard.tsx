"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Field, SegmentedControl } from "@/components/ui/Field";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { CropEditor } from "@/features/image-tools/CropEditor";
import { FormatSelect } from "@/features/image-tools/FormatSelect";
import { ImageInputPanel } from "@/features/image-tools/ImageInputPanel";
import { useImageInput } from "@/features/image-tools/useImageInput";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { formatDimensions } from "@/lib/file-processing/format";
import { type FitMode, type Rect, type Rotation, centeredCropForAspect, normalizeRotation, rotatedSize } from "@/lib/file-processing/image/geometry";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import { planImageOutput } from "../plan";
import { type PreparedFile, prepareImageDocument } from "../prepare-image";
import { PreparedResult } from "./PreparedResult";
import { takeHandOff } from "@/lib/handoff";
import { useI18n } from "@/lib/i18n/client";

const INK_DOCUMENTS = new Set(["signature", "left-thumb-impression", "handwritten-declaration"]);

function targetAspect(requirement: DocumentRequirement): number | null {
  const plan = planImageOutput({ width: 1, height: 1 }, requirement.pixels);
  return plan.aspect;
}

export function ImageDocumentCard({
  requirement,
  onPrepared,
  handoffKey,
}: {
  requirement: DocumentRequirement;
  onPrepared: (file: PreparedFile | null) => void;
  /** Load a photo handed over by another tool, if one is waiting. */
  handoffKey?: string;
}) {
  const { t } = useI18n();
  const e = t.exam;
  const job = useProcessingJob<PreparedFile>();
  const invalidate = () => {
    job.reset();
    onPrepared(null);
  };
  const input = useImageInput(invalidate);
  const { image, select } = input;

  useEffect(() => {
    if (!handoffKey) return;
    const file = takeHandOff(handoffKey);
    if (file) void select([file]);
  }, [handoffKey, select]);

  const allowedFormats = requirement.formats.filter((f): f is "jpeg" | "png" => f === "jpeg" || f === "png");
  const formats: ImageFormat[] = allowedFormats.length ? allowedFormats : ["jpeg", "png"];
  const aspect = targetAspect(requirement);
  const fixedSize = aspect !== null;

  const [rotation, setRotation] = useState<Rotation>(0);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 });
  const [fit, setFit] = useState<FitMode>("cover");
  const [background, setBackground] = useState("#ffffff");
  const [cleanup, setCleanup] = useState(false);
  const [format, setFormat] = useState<ImageFormat>(formats[0]!);

  const resetCrop = (img: InspectedImage | null, nextRotation: Rotation, nextFit: FitMode) => {
    if (!img) return;
    const bounds = rotatedSize(img, nextRotation);
    setCrop(centeredCropForAspect(bounds, fixedSize && nextFit === "cover" ? aspect : null));
  };

  const [seenImage, setSeenImage] = useState<InspectedImage | null>(null);
  if (image !== seenImage) {
    setSeenImage(image);
    setRotation(0);
    resetCrop(image, 0, fit);
  }

  const change = (apply: () => void) => {
    apply();
    invalidate();
  };

  const prepare = async () => {
    if (!image) return;
    const result = await job.run(({ signal, message }) =>
      prepareImageDocument(
        image,
        requirement,
        {
          crop,
          rotation,
          fit,
          background,
          format,
          adjustments: cleanup ? { grayscale: true, contrast: 35, brightness: 5 } : undefined,
        },
        { signal, onMessage: message, t },
      ),
    );
    if (result) onPrepared(result);
  };

  return (
    <div className="space-y-4">
      <ImageInputPanel {...input} onSelect={input.select} onClear={input.clear} title={e.chooseImage(requirement.label)}
        art={<DocumentArt type={requirement.type} className="h-16 w-16" />}
      />
      {image ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <CropEditor
            source={image.file}
            fullSize={image}
            rotation={rotation}
            aspect={fixedSize && fit === "cover" ? aspect : null}
            crop={crop}
            onCropChange={(next) => change(() => setCrop(next))}
            disabled={job.running}
          />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconButton icon="rotateCcw" label={e.rotateLeft} variant="secondary" size="md" onClick={() => change(() => { const r = normalizeRotation(rotation - 90); setRotation(r); resetCrop(image, r, fit); })} />
              <IconButton icon="rotateCw" label={e.rotateRight} variant="secondary" size="md" onClick={() => change(() => { const r = normalizeRotation(rotation + 90); setRotation(r); resetCrop(image, r, fit); })} />
              <Button variant="ghost" size="sm" icon="reset" onClick={() => change(() => { setRotation(0); resetCrop(image, 0, fit); })}>
                {t.common.reset}
              </Button>
            </div>
            {fixedSize ? (
              <SegmentedControl
                legend={e.fitLegend}
                value={fit}
                onChange={(value) => change(() => { setFit(value); resetCrop(image, rotation, value); })}
                options={[
                  { value: "cover", label: e.cropFill },
                  { value: "contain", label: e.fitBorder },
                ]}
                hint={fit === "cover" ? e.cropFillHint : e.fitBorderHint}
              />
            ) : null}
            <Field label={e.background}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  type="color"
                  value={background}
                  onChange={(e) => change(() => setBackground(e.target.value))}
                  className="h-10 w-20 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
                />
              )}
            </Field>
            {INK_DOCUMENTS.has(requirement.type) ? (
              <Checkbox
                label={e.cleanup}
                description={e.cleanupHelp}
                checked={cleanup}
                onChange={(e) => change(() => setCleanup(e.target.checked))}
              />
            ) : null}
            {formats.length > 1 ? <FormatSelect value={format} formats={formats} onChange={(f) => change(() => setFormat(f))} /> : null}
            <p className="tabular text-xs text-fg-subtle">
              {e.selectedArea(formatDimensions(crop.width, crop.height))}
              {fixedSize ? e.outputSize(requirement.pixels!.width!, requirement.pixels!.height!) : ""}
            </p>
            <Button className="w-full" onClick={prepare} loading={job.running}>
              {e.prepareImage(requirement.label)}
            </Button>
          </div>
        </div>
      ) : null}
      {job.state.status === "running" ? <ProcessingIndicator label={job.state.message ?? e.preparing} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" ? (
        <PreparedResult prepared={job.state.result} preview={<ImagePreview blob={job.state.result.blob} alt={e.preparedAlt(requirement.label)} maxHeight="12rem" />} />
      ) : null}
    </div>
  );
}
