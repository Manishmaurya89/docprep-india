// Generates the share-preview image and home-screen icons from the live site's
// own artwork, using Playwright's Chromium (a dev dependency).
//
//   npm run build && npm start      (in another terminal)
//   npm run brand-assets [-- http://localhost:3000]
//
// Re-run after changing the brand name (NEXT_PUBLIC_SITE_NAME) or the hero art.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const root = process.cwd();
const iconSvg = readFileSync(join(root, "app", "icon.svg"), "utf8");
mkdirSync(join(root, "public", "icons"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

// Pull the real hero illustration and brand name from the running site.
await page.goto(base, { waitUntil: "networkidle" });
const heroSvg = await page.locator("svg[aria-labelledby='hero-art-title']").evaluate((el) => el.outerHTML);
const brand = (await page.locator("header a").first().innerText()).trim();

async function shot(html, width, height, path) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}</style></head><body>${html}</body></html>`);
  await page.screenshot({ path, type: "png", omitBackground: false });
  console.log(`  ${path.replace(root + "/", "")}`);
}

const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:10px 20px;border-radius:999px;background:${bg};color:${fg};font-size:24px;font-weight:600;margin:0 12px 12px 0">${text}</span>`;

console.log("Writing brand assets:");
await shot(
  `<div style="display:flex;width:1200px;height:630px;background:#ffffff;box-sizing:border-box;padding:56px 56px 56px 72px;align-items:center;gap:24px">
     <div style="flex:1.15">
       <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
         <div style="width:56px;height:56px">${iconSvg.replace("<svg", '<svg width="56" height="56"')}</div>
         <span style="font-size:34px;font-weight:700;color:#111827">${brand}</span>
       </div>
       <div style="font-size:56px;line-height:1.12;font-weight:700;color:#111827;letter-spacing:-0.01em;margin-bottom:22px">Photos and documents ready for any online form</div>
       <div style="font-size:26px;color:#444d5c;margin-bottom:30px">Resize, compress and convert — on your phone. Nothing is uploaded.</div>
       <div>${chip("Exams &amp; jobs", "#eaf0ff", "#1d4ed8")}${chip("Bank &amp; KYC", "#eaf0ff", "#1d4ed8")}${chip("Passport &amp; visa", "#eaf0ff", "#1d4ed8")}${chip("Free · Private", "#dcfce7", "#166534")}</div>
     </div>
     <div style="flex:1;display:flex;align-items:center;justify-content:center">${heroSvg.replace("<svg", '<svg width="520" height="427"')}</div>
   </div>`,
  1200,
  630,
  join(root, "app", "opengraph-image.png"),
);

const mark = (size, scale, background) =>
  `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${background}">${iconSvg.replace(
    "<svg",
    `<svg width="${Math.round(size * scale)}" height="${Math.round(size * scale)}"`,
  )}</div>`;
await shot(mark(192, 1, "transparent"), 192, 192, join(root, "public", "icons", "icon-192.png"));
await shot(mark(512, 1, "transparent"), 512, 512, join(root, "public", "icons", "icon-512.png"));
// Maskable icons are cropped to a circle or squircle by the OS: keep the mark inside the safe zone.
await shot(mark(512, 0.7, "#1d4ed8"), 512, 512, join(root, "public", "icons", "icon-maskable-512.png"));
await shot(mark(180, 0.86, "#ffffff"), 180, 180, join(root, "app", "apple-icon.png"));

await browser.close();
console.log("Done.");
