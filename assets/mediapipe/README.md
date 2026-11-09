# MediaPipe models

Used by the photo background tool (`/tools/photo-background`). They run in the
visitor's browser through `@mediapipe/tasks-vision`; `scripts/copy-mediapipe.mjs`
copies them, with the MediaPipe WebAssembly runtime, to
`public/vendor/mediapipe/<package version>/` so they are served from our own
origin (no Google CDN, and `connect-src 'self'` still holds).

| File | What it does | Source | SHA-256 | Licence |
| --- | --- | --- | --- | --- |
| `selfie_segmenter-f16-v1.tflite` (249,537 bytes) | Separates a person from the background (256 × 256 input) | `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite` | `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b` | Apache License 2.0 ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf)) |
| `blaze_face_short_range-f16-v1.tflite` (229,746 bytes) | Finds the face, to centre and size it | `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite` | `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f` | Apache License 2.0 ([model card](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf)) |

Both model cards (May and June 2021, Google) state "Licensed under Apache
License, Version 2.0" and list surveillance and identity recognition as out of
scope; this tool uses them only to cut out and frame the visitor's own photo.

To update a model, download the new version, add it under a new name (for
example `-v2`), update the table and `lib/file-processing/background/assets.ts`.
Never overwrite a file in place: the vendor path is cached for a year.
