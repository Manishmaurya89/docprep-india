/// <reference lib="webworker" />
/**
 * Runs CPU-heavy image work off the main thread. Files arrive as Blobs via
 * structured clone (no network involved) and results are posted back.
 */
import { toProcessingError } from "@/lib/file-processing/errors";
import { offscreenBackend } from "@/lib/file-processing/image/canvas-backend";
import { reencodeJpeg, runImageJob } from "@/lib/file-processing/image/jobs";
import type { WorkerRequest, WorkerResponse } from "@/lib/file-processing/image/worker-protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const controllers = new Map<number, AbortController>();

function post(message: WorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

scope.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "cancel") {
    controllers.get(message.id)?.abort();
    return;
  }
  if (message.type === "ping") {
    post({ type: "pong", id: message.id });
    return;
  }

  const controller = new AbortController();
  controllers.set(message.id, controller);
  try {
    if (message.type === "image-job") {
      const result = await runImageJob(message.source, message.job, offscreenBackend, {
        signal: controller.signal,
        onProgress: (progress) => post({ type: "progress", id: message.id, progress }),
      });
      post({ type: "image-result", id: message.id, result });
    } else if (message.type === "reencode-jpeg") {
      const result = await reencodeJpeg(message.request, offscreenBackend);
      post({ type: "reencode-result", id: message.id, result }, result ? [result.bytes.buffer] : []);
    }
  } catch (error) {
    post({ type: "error", id: message.id, error: toProcessingError(error).toJSON() });
  } finally {
    controllers.delete(message.id);
  }
});
