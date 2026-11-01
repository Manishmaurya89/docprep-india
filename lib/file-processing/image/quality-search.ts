import { throwIfAborted } from "../errors";

/**
 * Finds encoder settings that produce a file within a byte range.
 *
 * The function never estimates: every candidate is actually encoded and its
 * real size measured. It is independent of the canvas so it can be unit tested
 * with deterministic encoders and reused for any lossy encoder.
 */
export interface SizeTarget {
  maxBytes: number;
  minBytes?: number;
}

export interface EncodedCandidate<T> {
  size: number;
  data: T;
}

export interface Attempt<T> extends EncodedCandidate<T> {
  quality: number;
  scale: number;
}

export type SearchStatus =
  /** Output size is within the target range. */
  | "met"
  /** Even the highest quality produces a file smaller than the minimum. */
  | "below-minimum"
  /** No setting tried produced a file at or below the maximum. */
  | "unreachable";

export interface SearchOptions {
  target: SizeTarget;
  /** Lossless encoders (PNG) ignore quality; only scale can change. */
  lossless?: boolean;
  minQuality?: number;
  maxQuality?: number;
  /** Binary-search steps per scale. 7 steps resolve quality to ~0.7%. */
  qualitySteps?: number;
  /** Allow reducing pixel dimensions when quality alone is not enough. */
  allowResize?: boolean;
  /** Smallest scale factor tried when resizing. */
  minScale?: number;
  maxResizeRounds?: number;
  signal?: AbortSignal;
  onAttempt?: (attempt: Attempt<unknown>, index: number) => void;
}

export interface SearchResult<T> {
  status: SearchStatus;
  /** The result to offer: the best match, or the smallest produced if unreachable. */
  best: Attempt<T>;
  attempts: number;
}

export type Encoder<T> = (quality: number, scale: number) => Promise<EncodedCandidate<T>>;

const fits = (size: number, target: SizeTarget) => size <= target.maxBytes;
const inRange = (size: number, target: SizeTarget) =>
  size <= target.maxBytes && (target.minBytes === undefined || size >= target.minBytes);

export async function searchForTargetSize<T>(encode: Encoder<T>, options: SearchOptions): Promise<SearchResult<T>> {
  const {
    target,
    lossless = false,
    minQuality = 0.1,
    maxQuality = 0.95,
    qualitySteps = 7,
    allowResize = false,
    minScale = 0.1,
    maxResizeRounds = 6,
    signal,
    onAttempt,
  } = options;

  if (!(target.maxBytes > 0)) throw new RangeError("target.maxBytes must be positive");
  if (target.minBytes !== undefined && target.minBytes > target.maxBytes) {
    throw new RangeError("target.minBytes must not exceed target.maxBytes");
  }

  let count = 0;
  let smallest: Attempt<T> | undefined;
  const tryEncode = async (quality: number, scale: number): Promise<Attempt<T>> => {
    throwIfAborted(signal);
    const result = await encode(quality, scale);
    const attempt: Attempt<T> = { ...result, quality, scale };
    count++;
    onAttempt?.(attempt, count);
    if (!smallest || attempt.size < smallest.size) smallest = attempt;
    return attempt;
  };

  /** Highest quality at this scale whose output fits the maximum, or undefined. */
  const bestAtScale = async (scale: number): Promise<Attempt<T> | undefined> => {
    const top = await tryEncode(maxQuality, scale);
    if (fits(top.size, target) || lossless) return fits(top.size, target) ? top : undefined;
    const bottom = await tryEncode(minQuality, scale);
    if (!fits(bottom.size, target)) return undefined;
    let lo = minQuality;
    let hi = maxQuality;
    let best = bottom;
    for (let i = 0; i < qualitySteps; i++) {
      const mid = (lo + hi) / 2;
      const attempt = await tryEncode(mid, scale);
      if (fits(attempt.size, target)) {
        best = attempt;
        lo = mid;
        // Close enough to the maximum: stop early to save encodes.
        if (attempt.size >= target.maxBytes * 0.97) break;
      } else {
        hi = mid;
      }
    }
    return best;
  };

  let scale = 1;
  let found = await bestAtScale(scale);

  if (!found && allowResize) {
    for (let round = 0; round < maxResizeRounds && !found && scale > minScale; round++) {
      const reference = smallest!;
      // File size scales roughly with pixel count; aim a little below the target.
      const ratio = Math.sqrt(target.maxBytes / reference.size) * 0.92;
      scale = Math.max(minScale, Math.min(scale * 0.9, reference.scale * ratio));
      found = await bestAtScale(scale);
    }
  }

  if (!found) return { status: "unreachable", best: smallest!, attempts: count };
  if (inRange(found.size, target)) return { status: "met", best: found, attempts: count };
  return { status: "below-minimum", best: found, attempts: count };
}
