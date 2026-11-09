import { enPages } from "@/lib/i18n/en";
import { TOOLS, type ProcessingLocation, type ToolDefinition } from "@/lib/tools/registry";

/**
 * What the site stores or transmits. The privacy page renders these lists
 * directly, so they must be updated whenever behaviour changes.
 */
export const PROCESSING_LABELS: Record<ProcessingLocation, { badge: string; description: string }> = enPages.privacy.processing;

export interface StoredItem {
  name: string;
  location: string;
  contents: string;
  purpose: string;
}

/** Everything persisted in the browser. Currently nothing; files are never persisted. */
export const BROWSER_STORAGE: readonly StoredItem[] = [];

export interface NetworkUse {
  /** Key of the description in the dictionaries (`privacy.networkUse`). */
  id: string;
  what: string;
  when: string;
  includesFileData: boolean;
}

export const NETWORK_USE: readonly NetworkUse[] = [
  { id: "pages", ...enPages.privacy.networkUse.pages!, includesFileData: false },
  { id: "pdfjs", ...enPages.privacy.networkUse.pdfjs!, includesFileData: false },
  { id: "mediapipe", ...enPages.privacy.networkUse.mediapipe!, includesFileData: false },
];

export function toolsByProcessing(location: ProcessingLocation): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.processing === location);
}

export function allToolsLocal(): boolean {
  return TOOLS.every((tool) => tool.processing === "local");
}
