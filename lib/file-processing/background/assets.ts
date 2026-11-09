/**
 * Where the MediaPipe runtime and models are served from: our own origin,
 * copied there by scripts/copy-mediapipe.mjs. The version must match the
 * installed @mediapipe/tasks-vision package (a unit test checks this).
 */
export const MEDIAPIPE_VERSION = "1.1.1";
const BASE = `/vendor/mediapipe/${MEDIAPIPE_VERSION}`;
export const MEDIAPIPE_WASM_PATH = `${BASE}/wasm`;
export const SEGMENTER_MODEL_FILE = "selfie_segmenter-f16-v1.tflite";
export const FACE_MODEL_FILE = "blaze_face_short_range-f16-v1.tflite";
export const SEGMENTER_MODEL_URL = `${BASE}/models/${SEGMENTER_MODEL_FILE}`;
export const FACE_MODEL_URL = `${BASE}/models/${FACE_MODEL_FILE}`;
