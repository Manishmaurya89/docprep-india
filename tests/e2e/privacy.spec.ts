import { expect, test } from "@playwright/test";

test.describe("privacy and security", () => {
  test("serves a strict content security policy and security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("adds upgrade-insecure-requests only behind HTTPS", async ({ request }) => {
    expect((await request.get("/")).headers()["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    const proxied = await request.get("/", { headers: { "x-forwarded-proto": "https" } });
    expect(proxied.headers()["content-security-policy"]).toContain("upgrade-insecure-requests");
  });

  test("uses a fresh nonce on every request", async ({ request }) => {
    const nonce = async () => /'nonce-([^']+)'/.exec((await request.get("/")).headers()["content-security-policy"] ?? "")?.[1];
    expect(await nonce()).not.toEqual(await nonce());
  });

  test("loads no third-party resources and sets no cookies", async ({ page, context, baseURL }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith(baseURL!) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url());
    });
    for (const path of ["/", "/tools", "/exam", "/privacy", "/tools/organize-pdf"]) await page.goto(path);
    expect(external).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });

  test("privacy page states local processing for every tool", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-summary")).toContainText("tools process files on your device");
    await expect(page.getByRole("cell", { name: "Uploads to server" })).toHaveCount(0);
  });
});

test("worker scripts carry a policy that blocks other origins", async ({ page, baseURL }) => {
  const workerResponses: { url: string; csp: string | undefined }[] = [];
  page.on("response", (response) => {
    if (/turbopack-worker|pdf\.worker/.test(response.url())) workerResponses.push({ url: response.url(), csp: response.headers()["content-security-policy"] });
  });
  const { makePdf } = await import("../helpers/pdf");
  await page.goto("/tools/organize-pdf");
  await page.getByTestId("pdf-input").setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(await makePdf([1])) });
  await expect(page.getByRole("img", { name: "Preview of page 1" })).toBeVisible();
  const pdfWorker = workerResponses.find((r) => r.url.includes("pdf.worker"));
  expect(pdfWorker?.url.startsWith(baseURL!)).toBe(true);
  expect(pdfWorker?.csp).toContain("connect-src 'self'");
  const chunk = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((src) => src.includes("/_next/static/chunks/")));
  const response = await page.request.get(chunk!);
  expect(response.headers()["content-security-policy"]).toContain("connect-src 'self'");
});

test("every tool page shows the privacy banner and the home page shows the promises", async ({ page }) => {
  const { TOOLS } = await import("@/lib/tools/registry");
  for (const tool of TOOLS.filter((t) => t.href.startsWith("/tools/"))) {
    await page.goto(tool.href);
    await expect(page.getByTestId("privacy-banner"), tool.slug).toContainText("Your file stays on this device");
  }
  await page.goto("/");
  const strip = page.getByRole("region", { name: "Why your files are safe here" });
  for (const promise of ["Files never leave your device", "No uploads", "No sign-up or login", "Free, no watermark"]) {
    await expect(strip.getByText(promise)).toBeVisible();
  }
  await page.goto("/privacy");
  await expect(page.getByTestId("no-storage")).toContainText("no cookies, no local storage");
});

test("the server refuses every request that could carry data", async ({ request }) => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await request.fetch("/tools/merge-pdf", { method, data: "x" });
    expect(response.status(), method).toBe(405);
    expect(response.headers().allow).toBe("GET, HEAD");
  }
  expect((await request.get("/tools/merge-pdf")).status()).toBe(200);
});

test("PDF.js assets are versioned and cached long-term", async ({ page }) => {
  const { makePdf } = await import("../helpers/pdf");
  const workerUrls: string[] = [];
  page.on("request", (r) => r.url().includes("pdf.worker") && workerUrls.push(r.url()));
  await page.goto("/tools/organize-pdf");
  await page.getByTestId("pdf-input").setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(await makePdf([1])) });
  await expect(page.getByRole("img", { name: "Preview of page 1" })).toBeVisible();
  expect(workerUrls[0]).toMatch(/\/vendor\/pdfjs\/\d+\.\d+\.\d+\/pdf\.worker\.min\.mjs$/);
  const response = await page.request.get(workerUrls[0]!);
  expect(response.headers()["cache-control"]).toContain("immutable");
});
