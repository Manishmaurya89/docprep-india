import type { SerializedProcessingError } from "../errors";
import type { ImageJob, ImageJobResult, JobProgress, ReencodeJpegRequest, ReencodeJpegResult } from "./jobs";

export type WorkerRequest =
  | { type: "image-job"; id: number; source: Blob; job: ImageJob }
  | { type: "reencode-jpeg"; id: number; request: ReencodeJpegRequest }
  | { type: "cancel"; id: number }
  | { type: "ping"; id: number };

export type WorkerResponse =
  | { type: "image-result"; id: number; result: ImageJobResult }
  | { type: "reencode-result"; id: number; result: ReencodeJpegResult | null }
  | { type: "progress"; id: number; progress: JobProgress }
  | { type: "pong"; id: number }
  | { type: "error"; id: number; error: SerializedProcessingError };
