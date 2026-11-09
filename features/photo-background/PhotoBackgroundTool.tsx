"use client";

import { useEffect, useState } from "react";
import { ToolArt } from "@/components/illustrations/ToolArt";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Slider } from "@/components/ui/Slider";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { IMAGE_ACCEPT } from "@/features/image-tools/ImageInputPanel";
import type { Cutout } from "@/lib/file-processing/background/cutout";
import { FACE_SHARE, type FrameShape, frameFor, outputFor } from "@/lib/file-processing/background/framing";
import { type ProcessingError, toProcessingError } from "@/lib/file-processing/errors";
import { baseName } from "@/lib/file-processing/filenames";
import { formatBytes } from "@/lib/file-processing/format";
import { inspectImageFile } from "@/lib/file-processing/inspect";
import { LIMITS } from "@/lib/file-processing/limits";
import { handOff } from "@/lib/handoff";
import { useI18n } from "@/lib/i18n/client";
import { type ColorChoice, ColorPicker, colorFor } from "./ColorPicker";
import { LiveCamera } from "./LiveCamera";

interface Processed {
  cutout: Cutout;
  /** File name without extension. */
  name: string;
  /** The photo before, for the side-by-side view. */
  original: Blob;
  from: "camera" | "file";
}

interface Portrait {
  for: Processed;
  blob: Blob;
  width: number;
  height: number;
}

/** Below this share of person pixels the cut-out probably missed. */
const LITTLE_PERSON = 0.04;

function canvasBlob(surface: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => surface.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode"))), "image/jpeg", 0.85));
}

export function PhotoBackgroundTool() {
  const { t, href } = useI18n();
  const text = t.photoBackground;
  const job = useProcessingJob<Processed>();
  const [choice, setChoice] = useState<ColorChoice>("white");
  const [custom, setCustom] = useState("#ffffff");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shape, setShape] = useState<FrameShape>("passport");
  const [faceShare, setFaceShare] = useState<number>(FACE_SHARE.initial);
  const [inputError, setInputError] = useState<ProcessingError | null>(null);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [renderError, setRenderError] = useState<ProcessingError | null>(null);
  const color = colorFor(choice, custom);
  const result = job.state.status === "success" ? job.state.result : null;

  const process = (input: Blob | HTMLCanvasElement, name: string, from: Processed["from"]) => {
    setCameraOpen(false);
    setInputError(null);
    setRenderError(null);
    setFaceShare(FACE_SHARE.initial);
    void job.run(async ({ signal, message }) => {
      message(text.working);
      const { cutOutPhoto } = await import("@/lib/file-processing/background/cutout");
      const cutout = await cutOutPhoto(input, { signal, onStage: (stage) => message(text.stages[stage]) });
      return { cutout, name, original: await canvasBlob(cutout.source), from };
    });
  };

  const onFiles = async (files: File[]) => {
    job.reset();
    setInputError(null);
    try {
      const image = await inspectImageFile(files[0]);
      process(image.file, baseName(image.file.name), "file");
    } catch (error) {
      setInputError(toProcessingError(error));
    }
  };

  // Re-draw whenever the colour, shape or face size changes. Only drawing and JPEG encoding: the models ran once.
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    void (async () => {
      try {
        const { encodePortrait, renderPortrait } = await import("@/lib/file-processing/background/cutout");
        const crop = frameFor(shape, result.cutout.size, result.cutout.face, faceShare);
        const output = outputFor(shape, crop, Boolean(result.cutout.face));
        const surface = renderPortrait(result.cutout, color, crop, output);
        const bytes = await encodePortrait(surface, output.dpi);
        surface.width = 0;
        if (!cancelled) {
          setRenderError(null);
          setPortrait({ for: result, blob: new Blob([bytes as BlobPart], { type: "image/jpeg" }), width: output.width, height: output.height });
        }
      } catch (error) {
        if (!cancelled) setRenderError(toProcessingError(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, color, shape, faceShare]);

  const shown = portrait && portrait.for === result ? portrait : null;
  const fileName = result ? `${result.name}-${choice === "custom" ? "photo" : choice.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-background.jpg` : "photo.jpg";
  const colorPicker = <ColorPicker value={choice} custom={custom} onChange={setChoice} onCustomChange={setCustom} />;

  return (
    <div className="space-y-6">
      {!result && job.state.status !== "running" ? (
        <>
          <Card>
            <CardBody>{colorPicker}</CardBody>
          </Card>
          {cameraOpen ? (
            <LiveCamera color={color} onCapture={(frame) => process(frame, "live-photo", "camera")} onClose={() => setCameraOpen(false)} />
          ) : (
            <section aria-label={text.sourceTitle} className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                data-testid="open-camera"
                onClick={() => {
                  job.reset();
                  setCameraOpen(true);
                }}
                className="lift flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-accent/40 bg-surface p-6 text-center transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="camera" className="h-8 w-8" />
                </span>
                <span className="text-base font-semibold text-fg">{text.camera}</span>
                <span className="text-sm text-fg-muted">{text.cameraText}</span>
              </button>
              <FileDropzone
                accept={IMAGE_ACCEPT}
                onFiles={onFiles}
                title={t.image.input.title}
                description={text.uploadText(formatBytes(LIMITS.imageMaxBytes, 0))}
                inputTestId="image-input"
                art={<ToolArt icon="photo-bg" className="h-16 w-24" />}
              />
            </section>
          )}
          {inputError ? <ErrorMessage error={inputError} /> : null}
        </>
      ) : null}

      {job.state.status === "running" ? <ProcessingIndicator label={job.state.message ?? text.working} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelledUnchanged}</Alert> : null}
      {job.state.status === "error" ? (
        <ErrorMessage
          error={job.state.error}
          actions={
            <Button variant="secondary" size="sm" onClick={() => job.reset()}>
              {text.another}
            </Button>
          }
        />
      ) : null}

      {result ? (
        <Card data-testid="photo-result">
          <CardHeader title={text.resultTitle} description={text.resultText} />
          <CardBody className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-3">
              {!result.cutout.face ? <Alert tone="warning">{text.noFace}</Alert> : null}
              {result.cutout.faceCount > 1 ? <Alert tone="warning">{text.manyFaces(result.cutout.faceCount)}</Alert> : null}
              {result.cutout.personShare < LITTLE_PERSON ? <Alert tone="warning">{text.littlePerson}</Alert> : null}
              {renderError ? <ErrorMessage error={renderError} /> : null}
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <ImagePreview
                  blob={shown?.blob ?? null}
                  alt={text.resultAlt}
                  caption={shown ? `${text.after} · ${text.details(shown.width, shown.height, formatBytes(shown.blob.size))}` : text.after}
                  maxHeight="26rem"
                />
                <ImagePreview blob={result.original} alt={text.originalAlt} caption={text.before} maxHeight="10rem" />
              </div>
            </div>
            <div className="space-y-5">
              {colorPicker}
              <SegmentedControl
                legend={text.shapeLegend}
                value={shape}
                onChange={setShape}
                options={(["passport", "square", "whole"] as const).map((value) => ({ value, label: text.shapes[value] }))}
                hint={text.shapeHints[shape]}
              />
              {shape !== "whole" && result.cutout.face ? (
                <Slider
                  label={text.zoom}
                  value={Math.round(faceShare * 100)}
                  min={Math.round(FACE_SHARE.min * 100)}
                  max={Math.round(FACE_SHARE.max * 100)}
                  onChange={(value) => setFaceShare(value / 100)}
                  format={text.zoomValue}
                />
              ) : null}
              <div className="space-y-3 border-t border-border pt-4">
                <DownloadButton blob={shown?.blob ?? null} filename={fileName} label={text.download} />
                <div className="space-y-1">
                  <ButtonLink
                    href={href("/tools/photo-signature")}
                    variant="secondary"
                    icon="arrowRight"
                    aria-disabled={!shown}
                    onClick={(event) => {
                      if (!shown) return event.preventDefault();
                      handOff(new File([shown.blob], fileName, { type: "image/jpeg" }), "photo-signature");
                    }}
                  >
                    {text.exactSize}
                  </ButtonLink>
                  <p className="text-xs text-fg-subtle">{text.exactSizeText}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.from === "camera" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="camera"
                      onClick={() => {
                        job.reset();
                        setCameraOpen(true);
                      }}
                    >
                      {text.retake}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="upload"
                    onClick={() => {
                      job.reset();
                      setCameraOpen(false);
                    }}
                  >
                    {text.another}
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
