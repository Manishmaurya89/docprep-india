"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Progress";
import { type CropHandle, adjustCrop, cropFromKey } from "@/lib/file-processing/image/crop-interaction";
import { type Rect, type Rotation, type Size, rotatedSize } from "@/lib/file-processing/image/geometry";
import { applyOrientation, createScaledBitmap } from "@/lib/file-processing/image/render";
import { useI18n } from "@/lib/i18n/client";

const PREVIEW_MAX_SIDE = 1600;
const HANDLES: { handle: CropHandle; className: string; label: string }[] = [
  { handle: "nw", className: "-top-1.5 -left-1.5 cursor-nwse-resize", label: "top-left" },
  { handle: "ne", className: "-top-1.5 -right-1.5 cursor-nesw-resize", label: "top-right" },
  { handle: "sw", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize", label: "bottom-left" },
  { handle: "se", className: "-bottom-1.5 -right-1.5 cursor-nwse-resize", label: "bottom-right" },
  { handle: "n", className: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize", label: "top" },
  { handle: "s", className: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize", label: "bottom" },
  { handle: "w", className: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize", label: "left" },
  { handle: "e", className: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize", label: "right" },
];

/**
 * Interactive crop box over a locally rendered preview. Coordinates are in
 * full-resolution pixels of the rotated image, so the preview's reduced size
 * never affects the output. Supports mouse, touch (pointer events) and
 * keyboard (arrows move, Shift+arrows resize).
 */
export function CropEditor({
  source,
  fullSize,
  rotation,
  flipHorizontal = false,
  flipVertical = false,
  aspect,
  crop,
  onCropChange,
  disabled,
}: {
  source: Blob;
  fullSize: Size;
  rotation: Rotation;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  aspect: number | null;
  crop: Rect;
  onCropChange: (crop: Rect) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ handle: CropHandle; startX: number; startY: number; start: Rect; scale: number } | null>(null);
  const instructionsId = useId();
  const oriented = rotatedSize(fullSize, rotation);

  useEffect(() => {
    let cancelled = false;
    let decoded: ImageBitmap | null = null;
    const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(fullSize.width, fullSize.height));
    createScaledBitmap(source, { width: fullSize.width * scale, height: fullSize.height * scale }, "from-image", "medium")
      .then((result) => {
        decoded = result;
        if (cancelled) result.close();
        else setBitmap(result);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      decoded?.close();
    };
  }, [source, fullSize.width, fullSize.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const size = rotatedSize({ width: bitmap.width, height: bitmap.height }, rotation);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    applyOrientation(ctx, { width: bitmap.width, height: bitmap.height }, { rotation, flipHorizontal, flipVertical });
    ctx.drawImage(bitmap, 0, 0);
    ctx.restore();
  }, [bitmap, rotation, flipHorizontal, flipVertical]);

  const begin = (handle: CropHandle, event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || !frameRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const rect = frameRef.current.getBoundingClientRect();
    drag.current = { handle, startX: event.clientX, startY: event.clientY, start: crop, scale: oriented.width / rect.width };
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = (event.clientX - state.startX) * state.scale;
    const dy = (event.clientY - state.startY) * state.scale;
    onCropChange(adjustCrop(state.start, state.handle, dx, dy, oriented, aspect, Math.max(8, Math.round(oriented.width / 100))));
  };
  const end = () => {
    drag.current = null;
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  if (failed) {
    return <p className="rounded-lg border border-danger/40 bg-danger-soft p-4 text-sm text-fg">{t.image.crop.editorFailed}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-center rounded-lg border border-border bg-surface-muted p-3">
        <div ref={frameRef} className="relative inline-block max-w-full overflow-hidden select-none" style={{ touchAction: "none" }}>
          <canvas ref={canvasRef} className="block h-auto max-h-[60vh] w-auto max-w-full" aria-hidden="true" />
          {!bitmap ? (
            <div className="flex h-48 w-72 max-w-full items-center justify-center text-fg-muted">
              <Spinner />
            </div>
          ) : (
            <div
              role="group"
              tabIndex={disabled ? -1 : 0}
              aria-label={t.image.crop.editorLabel(crop.width, crop.height, crop.x, crop.y)}
              aria-describedby={instructionsId}
              onPointerDown={(event) => begin("move", event)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onKeyDown={(event) => {
                const step = Math.max(1, Math.round(oriented.width / (event.altKey ? 400 : 100)));
                const next = cropFromKey(crop, event.key, event.shiftKey, step, oriented, aspect);
                if (next) {
                  event.preventDefault();
                  onCropChange(next);
                }
              }}
              className={cn(
                "absolute cursor-move border-2 border-white outline-none focus-visible:border-[var(--focus)]",
                "shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]",
              )}
              style={{
                left: pct(crop.x, oriented.width),
                top: pct(crop.y, oriented.height),
                width: pct(crop.width, oriented.width),
                height: pct(crop.height, oriented.height),
              }}
            >
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="border border-white/25" />
                ))}
              </div>
              {HANDLES.filter((h) => aspect === null || h.handle.length === 2).map(({ handle, className, label }) => (
                <span
                  key={handle}
                  aria-hidden="true"
                  data-handle={label}
                  onPointerDown={(event) => begin(handle, event)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  className={cn("absolute h-4 w-4 rounded-sm border-2 border-white bg-[var(--accent)] sm:h-3 sm:w-3", className)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <p id={instructionsId} className="text-xs text-fg-subtle">
        {t.image.crop.editorHelp}
      </p>
    </div>
  );
}
