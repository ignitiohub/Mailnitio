"use client";

import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";

export const TooltipProvider = T.Provider;

/** Tooltip with optional keyboard shortcut hint. Required on icon-only buttons (plus aria-label). */
export function Tooltip({
  content,
  shortcut,
  children,
  side = "top",
}: {
  content: string;
  shortcut?: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <T.Root delayDuration={300}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 flex items-center gap-2 rounded-control bg-text px-2 py-1 text-caption text-bg shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          {shortcut ? <kbd className="font-mono text-[11px] opacity-70">{shortcut}</kbd> : null}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
