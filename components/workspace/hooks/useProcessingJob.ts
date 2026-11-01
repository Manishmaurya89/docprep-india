"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type ProcessingError, toProcessingError } from "@/lib/file-processing/errors";

export interface JobProgress {
  done: number;
  total: number;
  label?: string;
}

export type JobState<T> =
  | { status: "idle"; cancelled?: boolean }
  | { status: "running"; progress?: JobProgress; message?: string }
  | { status: "success"; result: T }
  | { status: "error"; error: ProcessingError };

export interface JobContext {
  signal: AbortSignal;
  /** Report real progress (e.g. pages done / total). */
  progress: (progress: JobProgress) => void;
  /** Report a status message when no numeric progress exists. */
  message: (message: string) => void;
}

/**
 * Runs one processing task at a time.
 * - Starting a new run aborts the previous one.
 * - Results from superseded runs are discarded (no stale results after the
 *   user switches files mid-way).
 * - Unmounting aborts the running task.
 */
export function useProcessingJob<T>() {
  const [state, setState] = useState<JobState<T>>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  const run = useCallback(async (task: (context: JobContext) => Promise<T>): Promise<T | undefined> => {
    controller.current?.abort();
    const current = ++sequence.current;
    const own = new AbortController();
    controller.current = own;
    const isCurrent = () => current === sequence.current;
    setState({ status: "running" });
    try {
      const result = await task({
        signal: own.signal,
        progress: (progress) => isCurrent() && setState({ status: "running", progress }),
        message: (message) => isCurrent() && setState({ status: "running", message }),
      });
      if (!isCurrent()) return undefined;
      setState({ status: "success", result });
      return result;
    } catch (error) {
      if (!isCurrent()) return undefined;
      const mapped = toProcessingError(error);
      if (mapped.code === "cancelled") setState({ status: "idle", cancelled: true });
      else setState({ status: "error", error: mapped });
      return undefined;
    } finally {
      if (controller.current === own) controller.current = null;
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  /** Drops any result and aborts work in progress (e.g. when the input changes). */
  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    sequence.current++;
    setState({ status: "idle" });
  }, []);

  /** Shows an error that happened outside run() (e.g. while validating input). */
  const fail = useCallback((error: unknown) => {
    controller.current?.abort();
    sequence.current++;
    setState({ status: "error", error: toProcessingError(error) });
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, run, cancel, reset, fail, running: state.status === "running" };
}
