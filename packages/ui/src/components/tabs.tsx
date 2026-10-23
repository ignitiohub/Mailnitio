"use client";

import { Tabs as T } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export const Tabs = T.Root;

/** Segmented control style tabs; scrolls horizontally inside its own region on small screens. */
export function TabsList({ className, ...props }: ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-card border border-border bg-surface-2 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-control px-3 text-body font-medium whitespace-nowrap text-text-muted transition-colors duration-150",
        "hover:text-text data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm",
        "max-md:h-10",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("mt-6 focus-visible:outline-offset-4", className)} {...props} />;
}
