"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import {
  createContext,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useContext,
  useId,
} from "react";
import { cn } from "../lib/cn";

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Label above, helper text below, error in danger with an icon. Never uses the placeholder as the label.
 */
export function Field({
  id: idProp,
  label,
  helper,
  error,
  required = false,
  optional = false,
  className,
  children,
}: {
  /** Control id; generated when omitted. Set it when the control must be focusable by id. */
  id?: string;
  label: string;
  helper?: ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-body font-medium text-text">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
          {optional ? <span className="ml-1 font-normal text-text-subtle">(optional)</span> : null}
        </label>
        {children}
        {error ? (
          <p id={errorId} className="flex items-center gap-1.5 text-small text-danger">
            <AlertCircle aria-hidden className="size-4 shrink-0 stroke-[1.75]" />
            {error}
          </p>
        ) : null}
        {helper ? (
          <p id={helperId} className="text-small text-text-subtle">
            {helper}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(props: { id?: string; "aria-describedby"?: string; required?: boolean }) {
  const field = useContext(FieldContext);
  if (!field) return {};
  return {
    id: field.id,
    "aria-describedby": props["aria-describedby"] ?? field.describedBy,
    "aria-invalid": field.invalid || undefined,
    required: props.required ?? field.required,
  };
}

const controlClass = [
  "w-full rounded-control border border-border-strong bg-surface text-body text-text",
  "placeholder:text-text-subtle transition-colors duration-150",
  "hover:border-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/30",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-subtle",
  "aria-invalid:border-danger",
].join(" ");

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(controlClass, "h-9 px-3 max-md:h-11 max-md:text-body-lg", className)}
      {...props}
      {...useFieldProps(props)}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(controlClass, "min-h-24 px-3 py-2 max-md:text-body-lg", className)}
        {...props}
        {...useFieldProps(props)}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          controlClass,
          "h-9 appearance-none pr-9 pl-3 max-md:h-11 max-md:text-body-lg",
          className,
        )}
        {...props}
        {...useFieldProps(props)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 stroke-[1.75] text-text-subtle"
      />
    </div>
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border border-border-strong accent-[var(--primary)] max-md:size-5"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-body text-text">
        {label}
        {description ? <span className="block text-small text-text-muted">{description}</span> : null}
      </label>
    </div>
  );
}
