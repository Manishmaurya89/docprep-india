"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { type CameraProblem, cameraProblem } from "@/lib/file-processing/background/colors";
import { frameToCanvas } from "@/lib/file-processing/background/cutout";
import type { FramingHint } from "@/lib/file-processing/background/framing";
import type { LivePreview } from "@/lib/file-processing/background/live";
import { ProcessingError } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";

type Status = "starting" | "loading" | "live";
type Facing = "user" | "environment";

/**
 * The camera, showing the picture with the background already replaced.
 * The camera stops as soon as this closes (photo taken, cancelled, or the
 * page left); nothing is recorded.
 */
export function LiveCamera({ color, onCapture, onClose }: { color: string; onCapture: (frame: HTMLCanvasElement) => void; onClose: () => void }) {
  const { t } = useI18n();
  const text = t.photoBackground;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  const timers = useRef<number[]>([]);
  const [facing, setFacing] = useState<Facing>("user");
  const [status, setStatus] = useState<Status>("starting");
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [modelError, setModelError] = useState<ProcessingError | null>(null);
  const [hint, setHint] = useState<FramingHint | null>(null);
  const [cameraCount, setCameraCount] = useState(1);
  const [timer, setTimer] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let preview: LivePreview | null = null;
    const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((track) => track.stop());

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("No camera API"), { name: window.isSecureContext ? "TypeError" : "SecurityError" });
      const opened = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } } });
      if (cancelled) return stopStream(opened);
      stream = opened;
      video.srcObject = opened;
      await video.play();
      if (cancelled) return;
      setStatus("loading");
      const { startLivePreview } = await import("@/lib/file-processing/background/live");
      const started = await startLivePreview({ video, canvas, color: () => colorRef.current, onHint: setHint });
      if (cancelled) return started.stop();
      preview = started;
      setStatus("live");
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
      if (!cancelled) setCameraCount(devices.filter((device) => device.kind === "videoinput").length);
    };
    start().catch((error: unknown) => {
      if (cancelled) return;
      if (error instanceof ProcessingError) setModelError(error);
      else setProblem(cameraProblem(error));
    });

    return () => {
      cancelled = true;
      preview?.stop();
      stopStream(stream);
      video.srcObject = null;
    };
  }, [facing]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    onCapture(frameToCanvas(video, video.videoWidth, video.videoHeight));
  };

  const takePhoto = () => {
    if (!timer) return capture();
    setCountdown(3);
    timers.current = [1, 2, 3].map((second) =>
      window.setTimeout(() => {
        if (second < 3) return setCountdown(3 - second);
        setCountdown(null);
        capture();
      }, second * 1000),
    );
  };

  const switchCamera = () => {
    setStatus("starting");
    setHint(null);
    setFacing((current) => (current === "user" ? "environment" : "user"));
  };

  const live = status === "live";
  const statusText = countdown !== null ? text.countdown(countdown) : live && hint ? text.hints[hint] : "";

  return (
    <Card data-testid="live-camera">
      <CardBody className="space-y-4">
        {problem ? (
          <Alert tone="warning">{text.cameraProblems[problem]}</Alert>
        ) : modelError ? (
          <ErrorMessage error={modelError} />
        ) : (
          <>
            <div className={cn("relative mx-auto w-full max-w-xl overflow-hidden rounded-lg bg-surface-muted", !live && "aspect-[4/3]")}>
              <video ref={videoRef} playsInline muted aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-px w-px opacity-0" />
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={text.cameraLabel}
                data-testid="camera-preview"
                // A selfie view is mirrored like a mirror; the photo itself is saved the right way round.
                className={cn("block h-auto w-full", facing === "user" && "-scale-x-100", !live && "absolute h-px w-px opacity-0")}
              />
              {live ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[45%] left-1/2 aspect-[3/4] h-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-dashed border-white [filter:drop-shadow(0_0_1px_rgb(0_0_0/0.9))_drop-shadow(0_0_2px_rgb(0_0_0/0.5))]"
                />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center gap-2 p-6 text-center text-sm text-fg-muted">
                  <Spinner className="h-4 w-4 shrink-0" />
                  {status === "starting" ? text.starting : text.loadingModel}
                </p>
              )}
              {countdown !== null ? (
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
                  {countdown}
                </span>
              ) : null}
            </div>
            <p role="status" aria-live="polite" className={cn("min-h-5 text-center text-sm font-medium", hint === "good" ? "text-success" : "text-warning")}>
              {statusText}
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!problem && !modelError ? (
            <>
              <Button size="lg" icon="camera" onClick={takePhoto} disabled={!live || countdown !== null}>
                {text.takePhoto}
              </Button>
              <Checkbox label={text.timer} checked={timer} onChange={(event) => setTimer(event.target.checked)} />
              {cameraCount > 1 ? (
                <Button variant="secondary" icon="rotateCw" onClick={switchCamera} disabled={countdown !== null}>
                  {text.switchCamera}
                </Button>
              ) : null}
            </>
          ) : null}
          <Button variant="ghost" icon="x" onClick={onClose}>
            {text.closeCamera}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
