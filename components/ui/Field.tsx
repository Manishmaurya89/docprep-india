"use client";

import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from "react";
import { cn } from "./cn";

const control =
  "block w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus";

interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
  labelAside?: ReactNode;
}

/** Wires label, hint and error text to a control via id / aria-describedby. */
export function Field({ label, hint, error, children, className, labelAside }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  suffix?: ReactNode;
  labelAside?: ReactNode;
  fieldClassName?: string;
};

export function TextField({ label, hint, error, suffix, labelAside, fieldClassName, className, ...props }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} labelAside={labelAside} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(control, "h-10", suffix ? "pr-12" : undefined, className)}
            {...props}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-subtle">{suffix}</span>
          ) : null}
        </div>
      )}
    </Field>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  children: ReactNode;
};

export function SelectField({ label, hint, error, fieldClassName, className, children, ...props }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-10 pr-8", className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={description ? `${id}-desc` : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-[var(--accent)]"
        {...props}
      />
      <div className="text-sm">
        <label htmlFor={id} className="font-medium text-fg">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="text-xs text-fg-subtle">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

/** A radio group styled as a segmented control. Arrow keys move between options natively. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  name,
  hint,
  className,
}: {
  legend: ReactNode;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  name?: string;
  hint?: ReactNode;
  className?: string;
}) {
  const generated = useId();
  const groupName = name ?? generated;
  return (
    <fieldset className={cn("space-y-1.5", className)}>
      <legend className="mb-1.5 text-sm font-medium text-fg">{legend}</legend>
      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-muted p-1">
        {options.map((option) => {
          const id = `${groupName}-${option.value}`;
          const checked = option.value === value;
          return (
            <div key={option.value} className="min-w-0 flex-1">
              <input
                id={id}
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "flex h-8 cursor-pointer items-center justify-center rounded px-2 text-center text-sm whitespace-nowrap transition-colors",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-focus",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                  checked ? "bg-surface font-medium text-fg shadow-card" : "text-fg-muted hover:text-fg",
                )}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
    </fieldset>
  );
}
