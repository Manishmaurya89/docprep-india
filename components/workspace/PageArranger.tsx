"use client";

import { type PointerEvent as ReactPointerEvent, useId, useRef, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icons";
import type { Rotation } from "@/lib/file-processing/image/geometry";
import { type PageLayoutOptions, layoutImagePage } from "@/lib/file-processing/pdf/page-layout";
import { useI18n } from "@/lib/i18n/client";
import { useObjectUrl } from "./hooks/useObjectUrl";

export interface ArrangedPage {
  id: string;
  name: string;
  details?: string;
  status: "checking" | "ready" | "error";
  error?: string;
  /** The image itself, for the preview. */
  blob?: Blob;
  /** Upright size in pixels (before the user's rotation). */
  width?: number;
  height?: number;
  rotation: Rotation;
}

/**
 * Shows each image as the PDF page it will become, in page order. Pages can be
 * dragged (mouse anywhere on the picture; touch on the grip, so the page still
 * scrolls), moved with buttons or arrow keys, rotated and removed.
 */
export function PageArranger({
  pages,
  layout,
  onMove,
  onRotate,
  onRemove,
  disabled,
  label,
}: {
  pages: ArrangedPage[];
  layout: PageLayoutOptions;
  onMove: (id: string, toIndex: number) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const [dragId, setDragId] = useState<string | null>(null);
  // The ref is read by move events, which can arrive before React re-renders with the new state.
  const dragging = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const instructionsId = useId();

  const indexOf = (id: string) => pages.findIndex((p) => p.id === id);
  const move = (page: ArrangedPage, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    onMove(page.id, toIndex);
    setAnnouncement(t.arranger.nowPage(page.name, toIndex + 1, pages.length));
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>, page: ArrangedPage, fromGrip: boolean) => {
    if (disabled || (!fromGrip && event.pointerType !== "mouse") || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already be gone (fast tap); dragging still works without capture.
    }
    dragging.current = page.id;
    setDragId(page.id);
  };
  const dragMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragId = dragging.current;
    if (!dragId) return;
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-page-id]");
    const overId = over?.dataset.pageId;
    if (overId && overId !== dragId) {
      const to = indexOf(overId);
      const page = pages[indexOf(dragId)];
      if (page && to >= 0) move(page, to);
    }
  };
  const endDrag = () => {
    dragging.current = null;
    setDragId(null);
  };

  return (
    <div className="space-y-2">
      <p id={instructionsId} className="text-xs text-fg-subtle">
        {t.arranger.instructions}
      </p>
      <ol aria-label={label ?? t.arranger.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pages.map((page, index) => (
          <li
            key={page.id}
            data-page-id={page.id}
            data-testid="arranged-page"
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-surface p-2 transition-shadow",
              page.status === "error" ? "border-danger/40 bg-danger-soft" : "border-border",
              dragId === page.id && "z-10 border-accent shadow-lg ring-2 ring-accent",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">{t.arranger.page(index + 1)}</span>
              <button
                type="button"
                aria-label={t.arranger.reorder(page.name, index + 1, pages.length)}
                aria-describedby={instructionsId}
                disabled={disabled}
                onPointerDown={(event) => startDrag(event, page, true)}
                onPointerMove={dragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(event) => {
                  const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
                  if (!delta) return;
                  event.preventDefault();
                  move(page, index + delta);
                }}
                className="flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted hover:text-fg active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <Icon name="grip" className="h-5 w-5" />
              </button>
            </div>
            <div
              className={cn("flex h-44 items-center justify-center rounded-md bg-surface-muted p-2", !disabled && "cursor-grab")}
              onPointerDown={(event) => startDrag(event, page, false)}
              onPointerMove={dragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {page.status === "ready" && page.blob && page.width && page.height ? (
                <PagePreview page={page} layout={layout} pageNumber={index + 1} />
              ) : page.status === "checking" ? (
                <Spinner className="h-6 w-6 text-fg-subtle" />
              ) : (
                <p className="text-center text-xs font-medium text-danger">{page.error}</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-fg" title={page.name}>
                {page.name}
              </p>
              {page.details ? <p className="tabular truncate text-[11px] text-fg-subtle">{page.details}</p> : null}
            </div>
            <div className="flex items-center justify-between">
              <IconButton icon="arrowLeft" label={t.arranger.moveEarlier(page.name)} disabled={disabled || index === 0} onClick={() => move(page, index - 1)} />
              <IconButton
                icon="rotateCw"
                label={t.arranger.rotate(page.name)}
                disabled={disabled || page.status !== "ready"}
                onClick={() => {
                  onRotate(page.id);
                  setAnnouncement(t.arranger.rotated(page.name, (page.rotation + 90) % 360));
                }}
              />
              <IconButton
                icon="trash"
                label={t.arranger.remove(page.name)}
                disabled={disabled}
                onClick={() => {
                  onRemove(page.id);
                  setAnnouncement(t.arranger.removed(page.name));
                }}
              />
              <IconButton icon="arrowRight" label={t.arranger.moveLater(page.name)} disabled={disabled || index === pages.length - 1} onClick={() => move(page, index + 1)} />
            </div>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** The page as it will be printed into the PDF: same layout maths as the PDF writer. */
function PagePreview({ page, layout, pageNumber }: { page: ArrangedPage; layout: PageLayoutOptions; pageNumber: number }) {
  const { t } = useI18n();
  const url = useObjectUrl(page.blob);
  const sideways = page.rotation === 90 || page.rotation === 270;
  const uprightW = sideways ? page.height! : page.width!;
  const uprightH = sideways ? page.width! : page.height!;
  const box = layoutImagePage(uprightW, uprightH, layout);
  const portrait = box.pageHeight >= box.pageWidth;
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;
  return (
    <div
      className="relative bg-white shadow-card ring-1 ring-border"
      style={{ aspectRatio: `${box.pageWidth} / ${box.pageHeight}`, ...(portrait ? { height: "100%" } : { width: "100%" }) }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          left: pct(box.x, box.pageWidth),
          top: pct(box.pageHeight - box.y - box.drawHeight, box.pageHeight),
          width: pct(box.drawWidth, box.pageWidth),
          height: pct(box.drawHeight, box.pageHeight),
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: URL preview
          <img
            src={url}
            alt={t.arranger.alt(pageNumber, page.name, page.rotation)}
            draggable={false}
            className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              width: sideways ? pct(uprightH, uprightW) : "100%",
              height: sideways ? pct(uprightW, uprightH) : "100%",
              transform: `translate(-50%, -50%) rotate(${page.rotation}deg)`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function moveTo<T extends { id: string }>(items: T[], id: string, toIndex: number): T[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0 || toIndex < 0 || toIndex >= items.length || from === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(toIndex, 0, item!);
  return next;
}
