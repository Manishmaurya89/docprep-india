"use client";

import { useId } from "react";
import { cn } from "@/components/ui/cn";
import { BACKGROUND_COLORS, type BackgroundColorId } from "@/lib/file-processing/background/colors";
import { useI18n } from "@/lib/i18n/client";

export type ColorChoice = BackgroundColorId | "custom";

export function colorFor(choice: ColorChoice, custom: string): string {
  return choice === "custom" ? custom : BACKGROUND_COLORS.find((color) => color.id === choice)!.hex;
}

/** Background colour as large, labelled swatches (radio buttons), plus any colour. */
export function ColorPicker({
  value,
  custom,
  onChange,
  onCustomChange,
}: {
  value: ColorChoice;
  custom: string;
  onChange: (value: ColorChoice) => void;
  onCustomChange: (hex: string) => void;
}) {
  const { t } = useI18n();
  const text = t.photoBackground;
  const name = useId();
  const swatches: { id: ColorChoice; hex: string; label: string }[] = [
    ...BACKGROUND_COLORS.map((color) => ({ id: color.id, hex: color.hex, label: text.colors[color.id] })),
    { id: "custom", hex: custom, label: text.custom },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{text.colorLegend}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((swatch) => {
          const checked = swatch.id === value;
          return (
            <label
              key={swatch.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus",
                checked ? "border-accent bg-accent-soft font-medium text-fg" : "border-border bg-surface text-fg-muted hover:border-accent/50 hover:text-fg",
              )}
            >
              <input type="radio" name={name} value={swatch.id} checked={checked} onChange={() => onChange(swatch.id)} className="sr-only" />
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border border-black/15"
                // "Other" shows a colour wheel until it is chosen, then the colour picked.
                style={{ background: swatch.id === "custom" && !checked ? "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)" : swatch.hex }}
              />
              {swatch.label}
            </label>
          );
        })}
        {value === "custom" ? (
          <input
            type="color"
            aria-label={text.customLabel}
            value={custom}
            onChange={(event) => onCustomChange(event.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
          />
        ) : null}
      </div>
    </fieldset>
  );
}
