import { type ErrorDetailKey, ProcessingError, detail, fromSerialized, throwIfAborted } from "../errors";
import { domBackend, supportsOffscreenWorker } from "./canvas-backend";
import {
  type ImageJob,
  type ImageJobResult,
  type JobProgress,
  type ReencodeJpegRequest,
  type ReencodeJpegResult,
  reencodeJpeg as reencodeOnMainThread,
  runImageJob,
} from "./jobs";
import type { WorkerRequest, WorkerResponse } from "./worker-protocol";

export type Engine = "worker" | "main-thread";

export interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (progress: JobProgress) => void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  onProgress?: (progress: JobProgress) => void;
}

export type FallbackReason = Extract<ErrorDetailKey, "workerUnsupported" | "workerStartFailed" | "workerStopped" | "workerUnreadable">;

/**
 * Owns one image worker. Falls back to the main thread when workers or
 * OffscreenCanvas are unavailable, or when the worker fails to start.
 * Call dispose() when finished so the worker and its memory are released.
 */
export class ImageWorkerSession {
  private worker: Worker | null = null;
  private broken = false;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  /** Set after the first job: which engine actually ran it. */
  engine: Engine | null = null;
  /** Why the worker was not used, when it was not (a message key; see errors.ts). */
  fallbackReason: FallbackReason | null = null;

  private spawn(): Worker | null {
    if (this.broken) return null;
    if (!supportsOffscreenWorker()) {
      this.broken = true;
      this.fallbackReason = "workerUnsupported";
      return null;
    }
    try {
      const worker = new Worker(new URL("../../../workers/image.worker.ts", import.meta.url), {
        type: "module",
        name: "image-processor",
      });
      worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => this.handle(event.data));
      worker.addEventListener("error", (event) => {
        event.preventDefault();
        this.fail("workerStopped");
      });
      worker.addEventListener("messageerror", () => this.fail("workerUnreadable"));
      this.worker = worker;
      return worker;
    } catch {
      this.broken = true;
      this.fallbackReason = "workerStartFailed";
      return null;
    }
  }

  private fail(reason: FallbackReason): void {
    this.broken = true;
    this.fallbackReason = reason;
    this.worker?.terminate();
    this.worker = null;
    for (const [, pending] of this.pending) pending.reject(new ProcessingError("worker-failed", detail(reason)));
    this.pending.clear();
  }

  private handle(message: WorkerResponse): void {
    const pending = this.pending.get(message.id);
    if (!pending) return;
    switch (message.type) {
      case "progress":
        pending.onProgress?.(message.progress);
        return;
      case "error":
        this.pending.delete(message.id);
        pending.reject(fromSerialized(message.error));
        return;
      case "image-result":
      case "reencode-result":
        this.pending.delete(message.id);
        pending.resolve(message.result);
        return;
      case "pong":
        this.pending.delete(message.id);
        pending.resolve(true);
    }
  }

  private send<T>(worker: Worker, request: WorkerRequest, options: RunOptions): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const { signal } = options;
      if (signal?.aborted) return reject(new ProcessingError("cancelled"));
      const onAbort = () => {
        // Terminating is the only way to stop work already in progress.
        this.pending.delete(request.id);
        this.worker?.terminate();
        this.worker = null;
        for (const [, other] of this.pending) other.reject(new ProcessingError("cancelled"));
        this.pending.clear();
        reject(new ProcessingError("cancelled"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pending.set(request.id, {
        resolve: (value) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(value as T);
        },
        reject: (error) => {
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        },
        onProgress: options.onProgress,
      });
      worker.postMessage(request);
    });
  }

  async run(source: Blob, job: ImageJob, options: RunOptions = {}): Promise<ImageJobResult & { engine: Engine }> {
    throwIfAborted(options.signal);
    const worker = this.worker ?? this.spawn();
    if (worker) {
      try {
        const result = await this.send<ImageJobResult>(worker, { type: "image-job", id: this.nextId++, source, job }, options);
        this.engine = "worker";
        return { ...result, engine: "worker" };
      } catch (error) {
        if (!(error instanceof ProcessingError) || error.code !== "worker-failed") throw error;
      }
    }
    const result = await runImageJob(source, job, domBackend, options);
    this.engine = "main-thread";
    return { ...result, engine: "main-thread" };
  }

  async reencodeJpeg(request: ReencodeJpegRequest, options: RunOptions = {}): Promise<ReencodeJpegResult | null> {
    throwIfAborted(options.signal);
    const worker = this.worker ?? this.spawn();
    if (worker) {
      try {
        const result = await this.send<ReencodeJpegResult | null>(
          worker,
          { type: "reencode-jpeg", id: this.nextId++, request },
          options,
        );
        this.engine = "worker";
        return result;
      } catch (error) {
        if (!(error instanceof ProcessingError) || error.code !== "worker-failed") throw error;
      }
    }
    this.engine = "main-thread";
    return reencodeOnMainThread(request, domBackend);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [, pending] of this.pending) pending.reject(new ProcessingError("cancelled"));
    this.pending.clear();
  }
}

/** Runs one job in a fresh worker that is terminated afterwards. */
export async function processImage(
  source: Blob,
  job: ImageJob,
  options: RunOptions = {},
): Promise<ImageJobResult & { engine: Engine; fallbackReason: FallbackReason | null }> {
  const session = new ImageWorkerSession();
  try {
    const result = await session.run(source, job, options);
    return { ...result, fallbackReason: session.fallbackReason };
  } finally {
    session.dispose();
  }
}
