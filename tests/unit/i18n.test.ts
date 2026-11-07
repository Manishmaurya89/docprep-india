import { describe, expect, it } from "vitest";
import { ProcessingError, detail, errorText, fromSerialized } from "@/lib/file-processing/errors";
import { getMessages } from "@/lib/i18n";
import { isTranslated, localeFromPath, localizePath, stripLocale } from "@/lib/i18n/config";
import { enPages, enUi } from "@/lib/i18n/en";
import { hiPages, hiUi } from "@/lib/i18n/hi";
import { TOOLS } from "@/lib/tools/registry";

type Leaf = { path: string; value: unknown };

function leaves(value: unknown, path = ""): Leaf[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
  }
  return [{ path, value }];
}

const EN = { ...enUi, ...enPages, common: { ui: enUi.common, pages: enPages.common } };
const HI = { ...hiUi, ...hiPages, common: { ui: hiUi.common, pages: hiPages.common } };
const enLeaves = new Map(leaves(EN).map((leaf) => [leaf.path, leaf.value]));
const hiLeaves = new Map(leaves(HI).map((leaf) => [leaf.path, leaf.value]));

/**
 * Stands in for any argument a dictionary function takes (number, string,
 * list or object of values), so every function can be called in a test.
 */
const anything: unknown = new Proxy(function sample() {}, {
  get(_target, prop) {
    if (prop === Symbol.toPrimitive) return (hint: string) => (hint === "number" ? 7 : "7");
    if (prop === "length") return 7;
    if (typeof prop === "string" && prop in String.prototype) return () => "7";
    if (prop === "join") return () => "7";
    return anything;
  },
});

const render = (value: unknown): string => (typeof value === "function" ? String(value(anything, anything, anything, anything)) : String(value));

const DEVANAGARI = /[ऀ-ॿ]/;
/** Hindi entries that are rightly the same as English: ratios, page sizes and pure measurements. */
const SAME_IN_HINDI = new Set([
  "image.crop.aspects.3:4",
  "image.crop.aspects.4:3",
  "image.crop.aspects.16:9",
  "pdf.images.a4",
  "pdf.images.letter",
  "limits.exactPixels",
  "limits.sizeRange",
  "pdf.toImages.imageDetails",
]);

const ROUTES = new Set(["/", "/tools", "/exam", "/exam/custom", "/exam/sources", "/exam/verify", "/privacy", ...TOOLS.map((tool) => tool.href)]);
const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

describe("dictionaries", () => {
  it("Hindi has exactly the keys English has", () => {
    const missing = [...enLeaves.keys()].filter((path) => !hiLeaves.has(path));
    const extra = [...hiLeaves.keys()].filter((path) => !enLeaves.has(path));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("every entry has the same kind of value in both languages", () => {
    for (const [path, en] of enLeaves) {
      const hi = hiLeaves.get(path);
      expect(typeof hi, path).toBe(typeof en);
      expect(Array.isArray(hi), path).toBe(Array.isArray(en));
      // Lists that pair with code (links, steps, notes) must line up; extra search words may differ.
      if (Array.isArray(en) && !path.endsWith(".keywords")) expect((hi as unknown[]).length, path).toBe(en.length);
    }
  });

  it("no entry is empty and every function produces text", () => {
    for (const [lang, all] of [["en", enLeaves], ["hi", hiLeaves]] as const) {
      for (const [path, value] of all) {
        const texts = Array.isArray(value) ? value.map(String) : [render(value)];
        if (path.endsWith(".keywords") || path.startsWith("notes.exam")) continue;
        for (const text of texts) {
          expect(text.trim().length, `${lang}:${path}`).toBeGreaterThan(0);
          expect(text, `${lang}:${path}`).not.toMatch(/undefined|\[object|NaN/);
        }
      }
    }
  });

  it("Hindi text is written in Hindi", () => {
    const english = [...hiLeaves].filter(([path, value]) => {
      if (SAME_IN_HINDI.has(path) || path.endsWith(".keywords") || path.startsWith("notes.exam")) return false;
      const texts = Array.isArray(value) ? value.map(String) : [render(value)];
      return texts.some((text) => !DEVANAGARI.test(text));
    });
    expect(english.map(([path]) => path)).toEqual([]);
  });

  it("links in text point to real pages, the same ones in both languages", () => {
    const linksIn = (all: Map<string, unknown>) =>
      new Map([...all].map(([path, value]) => [path, (Array.isArray(value) ? value.map(String) : [render(value)]).flatMap((text) => [...text.matchAll(LINK)].map((m) => m[2]!))]));
    const en = linksIn(enLeaves);
    const hi = linksIn(hiLeaves);
    for (const [path, targets] of en) {
      expect(hi.get(path), path).toEqual(targets);
      for (const target of targets) expect(ROUTES.has(target.split(/[?#]/)[0]!), `${path}: ${target}`).toBe(true);
    }
  });

  it("covers every tool", () => {
    for (const tool of TOOLS) {
      for (const t of [getMessages("en"), getMessages("hi")]) {
        expect(t.tools[tool.slug as keyof typeof t.tools].title).toBeTruthy();
        expect(t.seo.toolTitles[tool.slug as keyof typeof t.seo.toolTitles]).toBeTruthy();
        expect(t.notes[tool.slug as keyof typeof t.notes]).toBeDefined();
      }
    }
  });

  it("keeps the English registry text in one place", () => {
    for (const tool of TOOLS) expect(tool.title).toBe(enUi.tools[tool.slug as keyof typeof enUi.tools].title);
  });
});

describe("error messages", () => {
  it("are shown in the page language and keep English as error.message", () => {
    const error = new ProcessingError("page-range", detail("pageStartsAtOne", { part: "0" }));
    expect(error.message).toBe('"0": page numbers start at 1.');
    expect(errorText(error, hiUi.errors).title).toBe('"0": पेज नंबर 1 से शुरू होते हैं।');
    expect(errorText(new ProcessingError("pdf-encrypted"), hiUi.errors).hint).toMatch(/पासवर्ड/);
  });

  it("survive worker serialisation with their message key", () => {
    const original = new ProcessingError("unsupported-format", detail("notAnImage", { name: "a.txt" }), { hint: detail("hintUnknownFormat") });
    const copy = fromSerialized(JSON.parse(JSON.stringify(original.toJSON())));
    expect(copy.message).toBe(original.message);
    expect(errorText(copy, hiUi.errors)).toEqual({ title: '"a.txt" JPEG, PNG या WebP इमेज नहीं है।', hint: hiUi.errors.details.hintUnknownFormat() });
  });
});

describe("language in the URL", () => {
  it("reads the language from the path", () => {
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/hi")).toBe("hi");
    expect(localeFromPath("/hi/tools/merge-pdf")).toBe("hi");
    expect(localeFromPath("/history")).toBe("en");
    expect(localeFromPath("/tools/hi")).toBe("en");
  });

  it("adds and removes the prefix, keeping query and hash", () => {
    expect(localizePath("/", "hi")).toBe("/hi");
    expect(localizePath("/tools#pdf", "hi")).toBe("/hi/tools#pdf");
    expect(localizePath("/?a=1", "hi")).toBe("/hi?a=1");
    expect(localizePath("/exam?org=ssc#choose-exam", "hi")).toBe("/hi/exam?org=ssc#choose-exam");
    expect(localizePath("/hi/tools", "hi")).toBe("/hi/tools");
    expect(localizePath("/hi/tools", "en")).toBe("/tools");
    expect(localizePath("/tools", "en")).toBe("/tools");
    expect(localizePath("https://ssc.gov.in", "hi")).toBe("https://ssc.gov.in");
    expect(stripLocale("/hi")).toBe("/");
    expect(stripLocale("/hi/privacy")).toBe("/privacy");
  });

  it("keeps the reviewer sheet English-only", () => {
    expect(localizePath("/exam/verify", "hi")).toBe("/exam/verify");
    expect(isTranslated("/exam/verify")).toBe(false);
    expect(isTranslated("/hi/tools/merge-pdf")).toBe(true);
  });
});
