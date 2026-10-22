import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium",
    "transition-colors duration-150 ease-out select-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-hover",
        secondary: "border border-border-strong bg-surface text-text hover:bg-surface-2 active:bg-surface-2",
        ghost: "text-text-muted hover:bg-surface-2 hover:text-text active:bg-surface-2",
        destructive: "bg-danger text-white hover:opacity-90 active:opacity-90 dark:text-bg",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-9 px-4 text-body",
        lg: "h-11 px-5 text-body-lg",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});
