import type { ReactNode } from "react";
import type { Tone } from "./Badge";
import { cn } from "./cn";
import { Icon, type IconName } from "./icons";

type AlertTone = Exclude<Tone, "neutral"> | "info";

const styles: Record<AlertTone, { box: string; icon: IconName }> = {
  info: { box: "border-border bg-surface-muted text-fg", icon: "info" },
  accent: { box: "border-accent/30 bg-accent-soft text-fg", icon: "info" },
  success: { box: "border-success/30 bg-success-soft text-fg", icon: "check" },
  warning: { box: "border-warning/40 bg-warning-soft text-fg", icon: "alert" },
  danger: { box: "border-danger/40 bg-danger-soft text-fg", icon: "alert" },
};
const iconColor: Record<AlertTone, string> = {
  info: "text-fg-muted",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Inline message. Errors use role="alert" so they are announced immediately;
 * other tones use role="status".
 */
export function Alert({
  tone = "info",
  title,
  children,
  actions,
  className,
  live = true,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const role = !live ? undefined : tone === "danger" ? "alert" : "status";
  return (
    <div role={role} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", styles[tone].box, className)}>
      <Icon name={styles[tone].icon} className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor[tone])} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-fg-muted [&_a]:text-accent [&_a]:underline">{children}</div> : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  );
}
