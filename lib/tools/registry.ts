/**
 * The catalogue of tools. Navigation, search, the home page and the privacy
 * page are all generated from this list, so adding a tool here — including
 * where it processes files — keeps every disclosure consistent.
 */
import { enUi } from "@/lib/i18n/en";

export type ToolCategory = "image" | "pdf" | "application";
export type ProcessingLocation = "local" | "server";
export type ToolIcon =
  | "resize"
  | "compress"
  | "crop"
  | "convert"
  | "id-photo"
  | "merge"
  | "split"
  | "extract"
  | "organize"
  | "images-pdf"
  | "pdf-image"
  | "photo-bg"
  | "pdf-compress"
  | "checklist";

export interface ToolDefinition {
  slug: string;
  href: string;
  category: ToolCategory;
  title: string;
  summary: string;
  keywords: string[];
  accepts: string[];
  /** Where file contents are processed. Shown on the tool page and the privacy page. */
  processing: ProcessingLocation;
  icon: ToolIcon;
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = enUi.categories;

export type ToolSlug = keyof typeof enUi.tools;

/** Names and summaries come from the English dictionary (lib/i18n/en.ts), the single source for that text. */
const tool = (definition: Omit<ToolDefinition, "href" | "title" | "summary" | "slug"> & { slug: ToolSlug; href?: string }): ToolDefinition => ({
  href: `/tools/${definition.slug}`,
  title: enUi.tools[definition.slug].title,
  summary: enUi.tools[definition.slug].summary,
  ...definition,
});

export const TOOLS: readonly ToolDefinition[] = [
  tool({
    slug: "exam",
    href: "/exam",
    category: "application",
    keywords: ["ssc", "upsc", "ibps", "sbi", "rrb", "railway", "bank", "exam", "recruitment", "government job", "application form", "sarkari"],
    accepts: ["JPEG", "PNG", "WebP", "PDF"],
    processing: "local",
    icon: "checklist",
  }),
  tool({
    slug: "photo-signature",
    category: "application",
    keywords: ["passport photo", "passport size", "signature", "thumb impression", "application photo", "kyc photo", "bank photo", "visa photo", "pan card photo", "custom preset", "200x230", "140x60", "kb range"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "id-photo",
  }),
  tool({
    slug: "photo-background",
    category: "image",
    keywords: [
      "photo background",
      "change background",
      "background change",
      "white background",
      "passport photo background",
      "passport size photo",
      "remove background",
      "red background",
      "blue background",
      "live photo",
      "camera",
      "selfie",
      "webcam",
      "kyc photo",
      "exam photo",
    ],
    accepts: ["JPEG", "PNG", "WebP", "Camera"],
    processing: "local",
    icon: "photo-bg",
  }),
  tool({
    slug: "resize-image",
    category: "image",
    keywords: ["resize", "dimensions", "pixels", "px", "width", "height", "scale", "photo size", "reduce resolution", "passport size", "visa"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "resize",
  }),
  tool({
    slug: "compress-image",
    category: "image",
    keywords: ["compress", "reduce size", "kb", "mb", "20kb", "50kb", "100kb", "200kb", "file size", "smaller", "kyc", "upload limit"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "compress",
  }),
  tool({
    slug: "crop-rotate-image",
    category: "image",
    keywords: ["crop", "rotate", "flip", "trim", "aspect ratio", "square", "straighten", "id card", "sideways"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "crop",
  }),
  tool({
    slug: "convert-image",
    category: "image",
    keywords: ["convert", "jpg to png", "png to jpg", "webp to jpg", "jpeg", "format", "change type"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "convert",
  }),
  tool({
    slug: "compress-pdf",
    category: "pdf",
    keywords: ["compress pdf", "reduce pdf size", "pdf kb", "shrink pdf", "pdf under 200kb", "pdf under 1mb", "bank statement", "kyc", "admission", "upload limit"],
    accepts: ["PDF"],
    processing: "local",
    icon: "pdf-compress",
  }),
  tool({
    slug: "merge-pdf",
    category: "pdf",
    keywords: ["merge", "combine", "join pdf", "append", "certificates", "mark sheets", "admission", "scholarship", "claim documents"],
    accepts: ["PDF"],
    processing: "local",
    icon: "merge",
  }),
  tool({
    slug: "split-pdf",
    category: "pdf",
    keywords: ["split", "separate", "page range", "divide pdf"],
    accepts: ["PDF"],
    processing: "local",
    icon: "split",
  }),
  tool({
    slug: "extract-pdf-pages",
    category: "pdf",
    keywords: ["extract", "select pages", "save pages", "pick pages"],
    accepts: ["PDF"],
    processing: "local",
    icon: "extract",
  }),
  tool({
    slug: "organize-pdf",
    category: "pdf",
    keywords: ["reorder", "rotate pdf", "delete pages", "remove pages", "organize", "arrange", "preview pdf"],
    accepts: ["PDF"],
    processing: "local",
    icon: "organize",
  }),
  tool({
    slug: "images-to-pdf",
    category: "pdf",
    keywords: ["jpg to pdf", "image to pdf", "photo to pdf", "scan to pdf", "png to pdf", "kyc documents", "aadhaar", "pan card", "id card", "bills", "insurance claim", "front and back"],
    accepts: ["JPEG", "PNG", "WebP"],
    processing: "local",
    icon: "images-pdf",
  }),
  tool({
    slug: "pdf-to-image",
    category: "pdf",
    keywords: [
      "pdf to jpg",
      "pdf to jpeg",
      "pdf to png",
      "pdf to image",
      "pdf to photo",
      "convert pdf",
      "aadhaar pdf to jpg",
      "e-aadhaar",
      "password protected pdf",
      "certificate",
      "mark sheet",
      "pan card",
    ],
    accepts: ["PDF"],
    processing: "local",
    icon: "pdf-image",
  }),
];

export function getTool(slug: string): ToolDefinition {
  const found = TOOLS.find((t) => t.slug === slug);
  if (!found) throw new Error(`Unknown tool: ${slug}`);
  return found;
}

export function toolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === category);
}

/** Simple ranked search over titles, summaries and keywords. */
export function searchTools(query: string, tools: readonly ToolDefinition[] = TOOLS): ToolDefinition[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...tools];
  const scored = tools
    .map((t) => {
      const title = t.title.toLowerCase();
      const keywords = t.keywords.join(" ").toLowerCase();
      const summary = t.summary.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 3;
        else if (keywords.includes(term)) score += 2;
        else if (summary.includes(term)) score += 1;
        else return { t, score: 0 };
      }
      return { t, score };
    })
    .filter((entry) => entry.score > 0);
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.t);
}

/** Order of the home-page tiles: the most-used jobs first. Tools missing from this list follow in registry order, so a new tool always appears. */
const TILE_ORDER: ToolSlug[] = [
  "compress-image",
  "photo-background",
  "resize-image",
  "photo-signature",
  "crop-rotate-image",
  "convert-image",
  "images-to-pdf",
  "pdf-to-image",
  "compress-pdf",
  "merge-pdf",
  "split-pdf",
  "organize-pdf",
  "extract-pdf-pages",
];

/** Every editing tool (everything under /tools/), in tile order. */
export function homeTiles(): ToolDefinition[] {
  const rank = (tool: ToolDefinition) => {
    const index = TILE_ORDER.indexOf(tool.slug as ToolSlug);
    return index === -1 ? TILE_ORDER.length : index;
  };
  return TOOLS.filter((tool) => tool.href.startsWith("/tools/")).sort((a, b) => rank(a) - rank(b));
}
