"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, SegmentedControl, SelectField, TextField } from "@/components/ui/Field";
import { DOCUMENT_TYPES } from "@/data/exam-requirements/constants";
import { useI18n } from "@/lib/i18n/client";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { type DraftDocument, buildCustomSpec, newDraft } from "../custom-preset";
import { getSpecWarnings } from "../spec-status";
import { ApplicationWorkspace } from "./ApplicationWorkspace";
import { SpecWarnings } from "./SpecWarnings";

export interface PresetOption {
  value: string;
  label: string;
  source: string;
  requirement: DocumentRequirement;
}

function draftFromRequirement(requirement: DocumentRequirement): Partial<DraftDocument> {
  const exact = requirement.pixels?.width !== undefined && requirement.pixels?.height !== undefined;
  const minimum = requirement.pixels?.minWidth !== undefined && requirement.pixels?.minHeight !== undefined;
  return {
    label: requirement.label,
    type: requirement.type,
    kind: requirement.kind === "pdf" ? "pdf" : "image",
    jpeg: requirement.formats.includes("jpeg") || requirement.formats.length === 0,
    png: requirement.formats.includes("png"),
    minKB: requirement.fileSize?.minKB?.toString() ?? "",
    maxKB: requirement.fileSize?.maxKB?.toString() ?? "",
    dimensions: exact ? "exact" : minimum ? "minimum" : "none",
    width: String(requirement.pixels?.width ?? requirement.pixels?.minWidth ?? ""),
    height: String(requirement.pixels?.height ?? requirement.pixels?.minHeight ?? ""),
  };
}

/**
 * Lets users enter the limits from any notification. The result is marked
 * "entered by you" and validated with the same schema as the registry.
 */
export function CustomPresetBuilder({
  initial,
  presets = [],
  allowMultiple = true,
}: {
  initial?: Partial<DraftDocument>[];
  presets?: PresetOption[];
  allowMultiple?: boolean;
}) {
  const { t } = useI18n();
  const c = t.custom;
  const [drafts, setDrafts] = useState<DraftDocument[]>(() => (initial?.length ? initial.map((d) => newDraft(d)) : [newDraft({ label: c.defaultPhoto })]));
  const [copiedFrom, setCopiedFrom] = useState<Record<string, string>>({});
  const built = useMemo(() => buildCustomSpec(drafts, t), [drafts, t]);
  // Applied requirements only change when the user confirms, so typing does not discard prepared files.
  const [applied, setApplied] = useState(() => (initial?.length ? buildCustomSpec(drafts, t).spec : null));
  const [version, setVersion] = useState(0);

  const update = (key: string, patch: Partial<DraftDocument>) => setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const dirty = JSON.stringify(applied?.documents ?? null) !== JSON.stringify(built.spec?.documents ?? null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={c.title} description={c.description} />
        <CardBody className="space-y-6">
          {drafts.map((draft, index) => (
            <fieldset key={draft.key} className="space-y-4 rounded-lg border border-border p-4" data-testid="preset-draft">
              <legend className="px-1 text-sm font-semibold text-fg">{allowMultiple ? c.documentNumber(index + 1) : c.document}</legend>
              {presets.length ? (
                <SelectField
                  label={c.startFrom}
                  value=""
                  onChange={(e) => {
                    const preset = presets.find((p) => p.value === e.target.value);
                    if (!preset) return;
                    update(draft.key, draftFromRequirement(preset.requirement));
                    setCopiedFrom((current) => ({ ...current, [draft.key]: preset.source }));
                  }}
                >
                  <option value="">{c.choose}</option>
                  {presets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              {copiedFrom[draft.key] ? (
                <p className="text-xs text-fg-subtle">{c.copiedFrom(copiedFrom[draft.key]!)}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={c.name} value={draft.label} onChange={(e) => update(draft.key, { label: e.target.value })} />
                <SelectField label={c.documentType} value={draft.type} onChange={(e) => update(draft.key, { type: e.target.value as DraftDocument["type"] })}>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t.documentTypes[type]}
                    </option>
                  ))}
                </SelectField>
              </div>
              <SegmentedControl
                legend={c.fileType}
                value={draft.kind}
                onChange={(kind) => update(draft.key, { kind })}
                options={[
                  { value: "image", label: c.image },
                  { value: "pdf", label: "PDF" },
                ]}
              />
              {draft.kind === "image" ? (
                <div className="flex flex-wrap gap-5">
                  <Checkbox label="JPG / JPEG" checked={draft.jpeg} onChange={(e) => update(draft.key, { jpeg: e.target.checked })} />
                  <Checkbox label="PNG" checked={draft.png} onChange={(e) => update(draft.key, { png: e.target.checked })} />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <TextField label={c.minSize} type="number" inputMode="decimal" min={0} step="any" suffix="KB" value={draft.minKB} onChange={(e) => update(draft.key, { minKB: e.target.value })} />
                <TextField label={c.maxSize} type="number" inputMode="decimal" min={0} step="any" suffix="KB" value={draft.maxKB} onChange={(e) => update(draft.key, { maxKB: e.target.value })} />
              </div>
              {draft.kind === "image" ? (
                <>
                  <SegmentedControl
                    legend={c.pixelDimensions}
                    value={draft.dimensions}
                    onChange={(dimensions) => update(draft.key, { dimensions })}
                    options={[
                      { value: "exact", label: c.exact },
                      { value: "minimum", label: c.minimum },
                      { value: "none", label: c.noPixelLimits },
                    ]}
                  />
                  {draft.dimensions !== "none" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <TextField label={t.common.width} type="number" inputMode="numeric" min={1} suffix="px" value={draft.width} onChange={(e) => update(draft.key, { width: e.target.value })} />
                      <TextField label={t.common.height} type="number" inputMode="numeric" min={1} suffix="px" value={draft.height} onChange={(e) => update(draft.key, { height: e.target.value })} />
                    </div>
                  ) : null}
                </>
              ) : null}
              {built.errors[draft.key]?.length ? (
                <Alert tone="danger" live={false}>
                  <ul className="list-disc pl-4">
                    {built.errors[draft.key]!.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
              {allowMultiple && drafts.length > 1 ? (
                <Button variant="ghost" size="sm" icon="trash" onClick={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}>
                  {c.removeDocument}
                </Button>
              ) : null}
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-3">
            {allowMultiple ? (
              <Button variant="secondary" icon="file" onClick={() => setDrafts((current) => [...current, newDraft({ label: c.defaultSignature, type: "signature" })])}>
                {c.addDocument}
              </Button>
            ) : null}
            <Button
              disabled={!built.spec || (!dirty && applied !== null)}
              onClick={() => {
                setApplied(built.spec);
                setVersion((v) => v + 1);
              }}
            >
              {applied ? c.applyChanges : c.useThese}
            </Button>
          </div>
          {applied && dirty && built.spec ? <p className="text-sm text-warning">{c.unapplied}</p> : null}
        </CardBody>
      </Card>

      {applied ? (
        <section aria-label={c.prepareSection} className="space-y-4">
          <SpecWarnings warnings={getSpecWarnings(applied, undefined, t)} />
          <ApplicationWorkspace key={version} spec={applied} zipName="prepared-documents.zip" />
        </section>
      ) : null}
    </div>
  );
}
