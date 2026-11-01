import { Icon, type IconName } from "@/components/ui/icons";
import type { ToolIcon as ToolIconName } from "@/lib/tools/registry";

const MAP: Record<ToolIconName, IconName> = {
  resize: "resize",
  compress: "compress",
  crop: "crop",
  convert: "convert",
  "id-photo": "idPhoto",
  merge: "merge",
  split: "split",
  extract: "extract",
  organize: "organize",
  "images-pdf": "imagesPdf",
  "pdf-compress": "pdfCompress",
  checklist: "checklist",
};

export function ToolIcon({ icon, className }: { icon: ToolIconName; className?: string }) {
  return (
    <span className={className ?? "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"}>
      <Icon name={MAP[icon]} className="h-5 w-5" />
    </span>
  );
}
