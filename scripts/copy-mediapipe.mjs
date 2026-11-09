// Copies the MediaPipe vision WebAssembly runtime (from node_modules) and the two
// models (from assets/mediapipe) into /public so the photo background tool loads
// them from our own origin. The package version is part of the path, so the
// files can be cached for a year; model file names carry their own version.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@mediapipe", "tasks-vision");

if (!existsSync(join(pkgDir, "package.json"))) {
  console.warn("[copy-mediapipe] @mediapipe/tasks-vision is not installed yet; skipping.");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const vendorDir = join(root, "public", "vendor", "mediapipe");
rmSync(vendorDir, { recursive: true, force: true });
const targetDir = join(vendorDir, version);
mkdirSync(join(targetDir, "wasm"), { recursive: true });
mkdirSync(join(targetDir, "models"), { recursive: true });
// Only the classic-script builds are used: SIMD for current browsers, no-SIMD for older ones
// (MediaPipe picks one at run time). The ES-module build is not needed.
for (const name of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  copyFileSync(join(pkgDir, "wasm", name), join(targetDir, "wasm", name));
}
const modelsDir = join(root, "assets", "mediapipe");
// The Docker "deps" stage installs packages before the source (and assets/) is copied; the
// build stage runs this again (prebuild) with everything in place.
if (existsSync(modelsDir)) {
  for (const name of readdirSync(modelsDir).filter((file) => file.endsWith(".tflite"))) {
    copyFileSync(join(modelsDir, name), join(targetDir, "models", name));
  }
} else {
  console.warn("[copy-mediapipe] assets/mediapipe not found; models will be copied by the build.");
}
console.log(`[copy-mediapipe] Copied MediaPipe ${version} runtime and models to public/vendor/mediapipe/${version}/`);
