"use client";

import { useSyncExternalStore } from "react";
import type { ImageFormat } from "@/lib/file-processing/detect";
import { getEncodeSupport } from "@/lib/file-processing/image/support";

const SERVER: Record<ImageFormat, boolean> = { jpeg: true, png: true, webp: true };
const subscribe = () => () => {};

export function useEncodeSupport(): Record<ImageFormat, boolean> {
  return useSyncExternalStore(subscribe, getEncodeSupport, () => SERVER);
}
