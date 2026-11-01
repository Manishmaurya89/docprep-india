export interface AspectPreset {
  id: string;
  label: string;
  /** width ÷ height; null = freeform; "original" resolved at runtime. */
  ratio: number | null | "original";
}

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "free", label: "Freeform", ratio: null },
  { id: "original", label: "Original", ratio: "original" },
  { id: "1:1", label: "1:1 Square", ratio: 1 },
  { id: "3.5:4.5", label: "3.5:4.5 Passport", ratio: 3.5 / 4.5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "a4", label: "A4 portrait", ratio: 210 / 297 },
];
