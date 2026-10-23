"use client";

import { Toaster as Sonner, toast } from "sonner";
import { useMediaQuery } from "../lib/use-media-query";

export { toast };

/** Toasts: bottom-right on desktop, top on mobile, 5s, announced politely to screen readers. */
export function Toaster() {
  const mobile = useMediaQuery("(max-width: 767px)");
  return (
    <Sonner
      position={mobile ? "top-center" : "bottom-right"}
      duration={5000}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-card !border !border-border !bg-surface !text-text !shadow-md !font-sans !text-body",
          description: "!text-text-muted",
          actionButton: "!bg-primary !text-primary-fg !rounded-control",
          cancelButton: "!bg-surface-2 !text-text !rounded-control",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
        },
      }}
    />
  );
}
