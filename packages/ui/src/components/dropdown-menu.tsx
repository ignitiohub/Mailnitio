"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-card border border-border bg-surface p-1 shadow-md data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-control px-2 text-body text-text outline-none select-none",
        "data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:stroke-[1.75] [&_svg]:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2 py-1.5 text-caption text-text-subtle", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}

export const DropdownMenuRadioGroup = M.RadioGroup;

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-control px-2 text-body text-text outline-none select-none",
        "data-[highlighted]:bg-surface-2 data-[state=checked]:font-medium data-[state=checked]:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </M.RadioItem>
  );
}
