// Generates synthetic files for manual testing into ./sample-files.
// Nothing here is a real photo or document: images are drawn with canvas in a
// headless browser (Playwright's Chromium, a dev dependency) and PDFs are built
// with pdf-lib. Run with: npm run samples
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";

const OUT = join(process.cwd(), "sample-files");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const save = (name, bytes) => {
  writeFileSync(join(OUT, name), bytes);
  console.log(`  ${name.padEnd(30)} ${(bytes.length / 1024).toFixed(1).padStart(8)} KB`);
};

// ---------------------------------------------------------------- images
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>samples</title>");

const images = await page.evaluate(async () => {
  const make = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
  };
  const encode = async (canvas, type, quality) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { type: blob.type, base64: btoa(binary) };
  };
  // Deterministic pseudo-random numbers so every run produces the same files.
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grain = (ctx, w, h, amount) => {
    const image = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = (random() - 0.5) * amount;
      image.data[i] += n;
      image.data[i + 1] += n;
      image.data[i + 2] += n;
    }
    ctx.putImageData(image, 0, 0);
  };
  const drawPortrait = (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#f4f6f9");
    bg.addColorStop(1, "#dfe5ee");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2d3e5c"; // shoulders
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 1.02, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9a6a4f"; // neck and face
    ctx.fillRect(w * 0.43, h * 0.5, w * 0.14, h * 0.18);
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.4, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f1712"; // hair
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.29, w * 0.21, h * 0.1, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#26201c"; // eyes
    for (const x of [0.43, 0.57]) {
      ctx.beginPath();
      ctx.ellipse(w * x, h * 0.39, w * 0.018, h * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, 18);
  };
  const scribble = (ctx, x, y, width, height, strokes, color, lineWidth) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    for (let i = 0; i < strokes; i++) {
      const px = x + ((i + 1) / strokes) * width;
      ctx.bezierCurveTo(px - width / strokes, y + random() * height, px - width / (2 * strokes), y + height - random() * height, px, y + height / 2 + (random() - 0.5) * height * 0.6);
    }
    ctx.stroke();
  };
  const out = {};

  {
    const [c, ctx] = make(1200, 1600);
    drawPortrait(ctx, 1200, 1600);
    out["photo-portrait.jpg"] = await encode(c, "image/jpeg", 0.92);
  }
  {
    // Stored sideways (as a phone camera does) — the EXIF tag added in Node rotates it upright.
    const [upright, uctx] = make(1200, 1600);
    drawPortrait(uctx, 1200, 1600);
    const [c, ctx] = make(1600, 1200);
    ctx.translate(0, 1200);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(upright, 0, 0);
    out["photo-phone-rotated.jpg"] = await encode(c, "image/jpeg", 0.9);
  }
  {
    const [c, ctx] = make(1500, 600);
    ctx.fillStyle = "#fbfbf8";
    ctx.fillRect(0, 0, 1500, 600);
    scribble(ctx, 150, 180, 1150, 240, 9, "#151515", 9);
    scribble(ctx, 420, 360, 600, 80, 4, "#151515", 6);
    grain(ctx, 1500, 600, 10);
    out["signature-scan.jpg"] = await encode(c, "image/jpeg", 0.9);
  }
  {
    const [c, ctx] = make(300, 120);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 300, 120);
    scribble(ctx, 20, 30, 260, 60, 6, "#000000", 3);
    out["signature-plain-small.png"] = await encode(c, "image/png");
  }
  {
    const [c, ctx] = make(800, 800);
    ctx.fillStyle = "#fdfdfd";
    ctx.fillRect(0, 0, 800, 800);
    ctx.strokeStyle = "#1c2a6b";
    for (let r = 10; r < 330; r += 9) {
      ctx.lineWidth = 3 + random() * 2;
      ctx.beginPath();
      ctx.ellipse(400, 420, r * 0.72, r, 0, 0.2 + random(), Math.PI * 2 - random() * 0.6);
      ctx.stroke();
    }
    grain(ctx, 800, 800, 14);
    out["thumb-impression.jpg"] = await encode(c, "image/jpeg", 0.9);
  }
  {
    const [c, ctx] = make(2000, 1000);
    ctx.fillStyle = "#fcfcfa";
    ctx.fillRect(0, 0, 2000, 1000);
    for (let line = 0; line < 6; line++) {
      for (let word = 0; word < 7; word++) scribble(ctx, 120 + word * 260, 110 + line * 140, 200, 60, 4, "#121212", 5);
    }
    grain(ctx, 2000, 1000, 10);
    out["handwritten-declaration.jpg"] = await encode(c, "image/jpeg", 0.9);
  }
  {
    const [c, ctx] = make(600, 400);
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(200, 200, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(234, 88, 12, 0.8)";
    ctx.fillRect(280, 110, 220, 180);
    out["logo-transparent.png"] = await encode(c, "image/png");
  }
  {
    const [c, ctx] = make(4000, 3000);
    const sky = ctx.createLinearGradient(0, 0, 0, 3000);
    sky.addColorStop(0, "#7fb2e5");
    sky.addColorStop(0.55, "#e8d9b5");
    sky.addColorStop(1, "#5f7d3a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 4000, 3000);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `hsla(${90 + random() * 60}, 40%, ${20 + random() * 30}%, 0.6)`;
      ctx.beginPath();
      ctx.ellipse(random() * 4000, 1900 + random() * 1100, 30 + random() * 160, 20 + random() * 90, random(), 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, 4000, 3000, 40);
    out["large-photo-12mp.jpg"] = await encode(c, "image/jpeg", 0.92);
  }
  {
    // A4 at 300 DPI: 2480 × 3508 px.
    const [c, ctx] = make(2480, 3508);
    ctx.fillStyle = "#f6f3ea";
    ctx.fillRect(0, 0, 2480, 3508);
    ctx.strokeStyle = "#6b4f2a";
    ctx.lineWidth = 18;
    ctx.strokeRect(120, 120, 2240, 3268);
    ctx.fillStyle = "#3b2f20";
    ctx.font = "bold 120px serif";
    ctx.textAlign = "center";
    ctx.fillText("SAMPLE CERTIFICATE", 1240, 520);
    ctx.font = "56px serif";
    ctx.fillText("Synthetic test document — not a real certificate", 1240, 680);
    for (let line = 0; line < 22; line++) scribble(ctx, 300, 900 + line * 110, 1880, 40, 14, "#2a2a2a", 4);
    ctx.strokeStyle = "#8a1c1c";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(1900, 3150, 170, 0, Math.PI * 2);
    ctx.stroke();
    grain(ctx, 2480, 3508, 22);
    out["certificate-scan-a4.jpg"] = await encode(c, "image/jpeg", 0.9);
  }
  {
    const [c, ctx] = make(800, 600);
    drawPortrait(ctx, 800, 600);
    out["webp-image.webp"] = await encode(c, "image/webp", 0.85);
  }
  return out;
});
await browser.close();

console.log(`Writing sample files to ${OUT}`);
const bytesOf = (name) => Buffer.from(images[name].base64, "base64");
for (const name of Object.keys(images)) {
  if (name === "photo-phone-rotated.jpg") continue;
  save(name, bytesOf(name));
}

/** Inserts an EXIF APP1 segment with Orientation = 6 ("rotate 90° clockwise to display"). */
function withExifOrientation(jpeg, orientation) {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const payload = [...Buffer.from("Exif"), 0, 0, ...tiff];
  const length = payload.length + 2;
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload]), jpeg.subarray(2)]);
}
save("photo-phone-rotated.jpg", withExifOrientation(bytesOf("photo-phone-rotated.jpg"), 6));

// ---------------------------------------------------------------- invalid inputs
save("not-really-an-image.jpg", Buffer.from("This is a text file with a .jpg name. Renaming does not convert a file.\n"));
save("iphone-photo.heic", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(64)]));
save("empty-file.png", Buffer.alloc(0));
save("damaged.png", Buffer.from("89504e470d0a1a0a0000000d49484452000003200000025808060000002b6e4b7a0000", "hex"));
save("not-really-a.pdf", Buffer.from("Plain text pretending to be a PDF.\n"));
save("broken.pdf", Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(800, 65)]));

// ---------------------------------------------------------------- PDFs
async function numberedPdf(labels, size, colour) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const label of labels) {
    const p = doc.addPage(size);
    const { width, height } = p.getSize();
    p.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: colour, borderWidth: 4 });
    p.drawText(label, { x: 70, y: height / 2, size: 54, font, color: colour });
    p.drawText("Synthetic test document", { x: 70, y: height / 2 - 50, size: 18, font, color: rgb(0.4, 0.4, 0.4) });
  }
  return doc.save();
}
const A4 = [595.28, 841.89];
save("document-5-pages.pdf", await numberedPdf(["Page 1", "Page 2", "Page 3", "Page 4", "Page 5"], A4, rgb(0.11, 0.3, 0.85)));
save("appendix-2-pages-letter.pdf", await numberedPdf(["Appendix A", "Appendix B"], [612, 792], rgb(0.6, 0.2, 0.1)));

{
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(bytesOf("certificate-scan-a4.jpg"));
  doc.addPage(A4).drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
  save("scanned-certificate.pdf", await doc.save());
}
{
  const doc = await PDFDocument.create();
  const photo = await doc.embedJpg(bytesOf("large-photo-12mp.jpg"));
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([A4[1], A4[0]]);
    p.drawImage(photo, { x: 20, y: 20, width: A4[1] - 40, height: A4[0] - 40 });
  }
  save("photos-album-large.pdf", await doc.save());
}

// A genuinely password-protected PDF when Ghostscript is installed; otherwise a
// PDF whose trailer declares encryption (enough to exercise the error path).
const plain = await numberedPdf(["Locked page"], A4, rgb(0.2, 0.2, 0.2));
let encrypted = null;
try {
  const input = join(OUT, ".plain-tmp.pdf");
  const output = join(OUT, "password-protected.pdf");
  writeFileSync(input, plain);
  execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite", "-sOwnerPassword=owner-test", "-sUserPassword=test1234", "-dEncryptionR=3", "-dKeyLength=128", `-sOutputFile=${output}`, input], { stdio: "ignore" });
  rmSync(input);
  encrypted = "ghostscript";
  console.log("  password-protected.pdf          (real encryption, password: test1234)");
} catch {
  rmSync(join(OUT, ".plain-tmp.pdf"), { force: true });
}
if (!encrypted) {
  const doc = await PDFDocument.load(plain);
  doc.context.trailerInfo.Encrypt = doc.context.register(
    doc.context.obj({ Filter: PDFName.of("Standard"), V: 1, R: 2, O: PDFString.of("0".repeat(32)), U: PDFString.of("0".repeat(32)), P: -44 }),
  );
  save("password-protected.pdf", await doc.save({ useObjectStreams: false }));
  console.log("  (Ghostscript not found: password-protected.pdf only declares encryption)");
}

writeFileSync(
  join(OUT, "README.txt"),
  `Synthetic files for manual testing. None contain personal data.
See docs/MANUAL_TEST_PLAN.md for what to do with each one.
Regenerate with: npm run samples
`,
);
console.log("Done.");
