import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./icons";
import { Spinner } from "./Progress";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-card",
  secondary:
    "border border-border-strong bg-surface text-fg hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent",
  ghost: "text-fg-muted hover:bg-surface-muted hover:text-fg",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const iconSizes: Record<ButtonSize, string> = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant, size, icon, loading, children, className, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "sm",
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  // Square sizes are separate from text-button sizes so padding classes never conflict.
  return (
    <button type="button" aria-label={label} title={label} className={cn(base, variants[variant], iconSizes[size], className)} {...props}>
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: IconName }) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </Link>
  );
}
