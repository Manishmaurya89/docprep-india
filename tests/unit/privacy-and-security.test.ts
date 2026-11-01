import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BROWSER_STORAGE, NETWORK_USE, PROCESSING_LABELS, allToolsLocal, toolsByProcessing } from "@/lib/privacy/disclosures";
import { buildContentSecurityPolicy, buildWorkerContentSecurityPolicy, createNonce, servedOverHttps } from "@/lib/security/csp";
import { TOOLS } from "@/lib/tools/registry";

const ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const APP_SOURCES = ["app", "components", "features", "lib", "workers", "data"].flatMap((dir) => sourceFiles(join(ROOT, dir)));

describe("processing disclosures", () => {
  it("declares every current tool as local processing", () => {
    expect(allToolsLocal()).toBe(true);
    expect(toolsByProcessing("server")).toEqual([]);
    expect(toolsByProcessing("local").length).toBe(TOOLS.length);
  });

  it("has a label for every processing location", () => {
    for (const tool of TOOLS) expect(PROCESSING_LABELS[tool.processing].badge).toBeTruthy();
  });

  it("never lists file data in network use or browser storage", () => {
    expect(NETWORK_USE.every((use) => !use.includesFileData)).toBe(true);
    expect(BROWSER_STORAGE).toEqual([]);
  });

  it("has no API routes or server actions that could receive files", () => {
    const routeHandlers = APP_SOURCES.filter((file) => /[/\\]app[/\\].*route\.tsx?$/.test(file));
    expect(routeHandlers).toEqual([]);
    const serverActions = APP_SOURCES.filter((file) => /^["']use server["']/m.test(readFileSync(file, "utf8")));
    expect(serverActions).toEqual([]);
  });

  it("does not send data from application code", () => {
    // Network calls in app code would contradict the privacy page. PDF.js fetches its
    // own same-origin assets internally; our code never calls these APIs.
    const offenders = APP_SOURCES.filter((file) => /\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource\(/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("does not persist files in browser storage", () => {
    const storageApi = /\b(?:localStorage|sessionStorage)\.(?:setItem|getItem|removeItem)|indexedDB\.open|caches\.open/;
    const storageUsers = APP_SOURCES.filter((file) => storageApi.test(readFileSync(file, "utf8")));
    expect(storageUsers.map((file) => file.replace(ROOT, ""))).toEqual([]);
  });
});

describe("content security policy", () => {
  it("restricts connections, scripts and framing in production", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc", isDevelopment: false, upgradeInsecure: true });
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' 'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toMatch(/https?:\/\//);
  });

  it("only relaxes eval and websocket in development", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc", isDevelopment: true, upgradeInsecure: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("gives workers a policy that blocks other origins", () => {
    const worker = buildWorkerContentSecurityPolicy({ isDevelopment: false });
    expect(worker).toContain("connect-src 'self'");
    expect(worker).toContain("default-src 'self'");
    expect(worker).not.toContain("'unsafe-eval'");
    expect(buildWorkerContentSecurityPolicy({ isDevelopment: true })).toContain("'unsafe-eval'");
  });

  it("upgrades insecure requests only for pages served over HTTPS", () => {
    expect(servedOverHttps("https:", null)).toBe(true);
    expect(servedOverHttps("http:", "https")).toBe(true); // behind a TLS-terminating proxy
    expect(servedOverHttps("http:", "https, http")).toBe(true);
    expect(servedOverHttps("http:", null)).toBe(false); // e.g. http://192.168.1.5:3000 from a phone
    expect(servedOverHttps("http:", "http")).toBe(false);
  });

  it("creates unpredictable nonces", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
