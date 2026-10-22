"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";

/**
 * Modal: confirmations and short forms only. Radix handles focus trapping, Escape and aria wiring.
 */
export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4",
            "rounded-modal border border-border bg-surface p-6 shadow-lg data-[state=open]:animate-fade-in",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <D.Title className="text-h4 text-text">{title}</D.Title>
              {description ? (
                <D.Description className="text-body text-text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X aria-hidden />
              </Button>
            </D.Close>
          </div>
          {children}
          {footer ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/**
 * Drawer: detail/edit panels from the right on desktop (480–640px), full-screen sheet on mobile.
 * `side="left"` is used for the mobile navigation drawer; `side="bottom"` for mobile filter sheets.
 */
export function Drawer({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  side = "right",
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  side?: "right" | "left" | "bottom";
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in" />
        <D.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface shadow-lg",
            side === "right" &&
              "inset-y-0 right-0 w-full border-l border-border data-[state=open]:animate-slide-in-right md:w-[560px] md:rounded-l-modal",
            side === "left" &&
              "inset-y-0 left-0 w-[288px] max-w-[85vw] border-r border-border data-[state=open]:animate-fade-in",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[85vh] rounded-t-modal border-t border-border data-[state=open]:animate-slide-up",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-6">
            <div className="flex flex-col gap-1">
              <D.Title className="text-h4 text-text">{title}</D.Title>
              {description ? (
                <D.Description className="text-body text-text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X aria-hidden />
              </Button>
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end md:px-6">
              {footer}
            </div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;
