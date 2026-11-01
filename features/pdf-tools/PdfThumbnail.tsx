"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Progress";
import type { PdfJsDocument } from "@/lib/file-processing/pdf/pdfjs";
import { useI18n } from "@/lib/i18n/client";

/**
 * Renders one page with PDF.js, locally, only once it scrolls into view.
 * Extra rotation is applied when rendering so the preview matches the output.
 */
export function PdfThumbnail({
  doc,
  pageNumber,
  rotation = 0,
  width = 150,
}: {
  doc: PdfJsDocument;
  pageNumber: number;
  rotation?: number;
  width?: number;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no observer support: render immediately
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const totalRotation = (page.rotate + rotation) % 360;
        const base = page.getViewport({ scale: 1, rotation: totalRotation });
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: (width / base.width) * ratio, rotation: totalRotation });
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        task = page.render({ canvas, viewport, background: "#ffffff" });
        await task.promise;
        if (!cancelled) setState("done");
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, rotation, width, visible]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded border border-border bg-white" style={{ width, minHeight: width * 1.1 }}>
      <canvas ref={canvasRef} role="img" aria-label={t.pdf.pagePreview(pageNumber)} className="block h-auto max-w-full" style={{ width }} />
      {state === "loading" ? (
        <span className="absolute inset-0 flex items-center justify-center text-fg-subtle">
          <Spinner className="h-5 w-5" />
        </span>
      ) : null}
      {state === "error" ? <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-danger">{t.pdf.previewUnavailable}</span> : null}
    </div>
  );
}
