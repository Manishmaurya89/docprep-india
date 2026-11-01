// Copies the PDF.js worker and assets into /public so they are served from our
// own origin (no third-party CDN, and the CSP can restrict workers to 'self').
// The version is part of the path, so browsers can cache these large files for
// a year and still pick up a new copy when pdfjs-dist is upgraded.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "pdfjs-dist");
const source = join(pkgDir, "build", "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.warn("[copy-pdf-worker] pdfjs-dist is not installed yet; skipping.");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const vendorDir = join(root, "public", "vendor", "pdfjs");
rmSync(vendorDir, { recursive: true, force: true });
const targetDir = join(vendorDir, version);
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "pdf.worker.min.mjs"));
// Font data, CMaps and WebAssembly decoders are fetched by PDF.js only when a
// document needs them (non-embedded fonts, CJK text, JPEG 2000 / JBIG2 scans).
for (const dir of ["standard_fonts", "cmaps", "wasm"]) {
  cpSync(join(pkgDir, dir), join(targetDir, dir), { recursive: true });
}
console.log(`[copy-pdf-worker] Copied PDF.js ${version} worker and assets to public/vendor/pdfjs/${version}/`);
