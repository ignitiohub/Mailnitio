import { AlertTriangle, Info, type LucideIcon, OctagonAlert, RefreshCw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";

/** Empty: icon + one-line explanation + the primary next action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon aria-hidden className="size-5 stroke-[1.75]" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-h4 text-text">{title}</p>
        <p className="text-body text-text-muted">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Error: plain-language message, retry, and a support reference ID. Never a stack trace. */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this page. Try again, and if it keeps happening, contact support with the reference below.",
  referenceId,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  referenceId?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <OctagonAlert aria-hidden className="size-5 stroke-[1.75]" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-h4 text-text">{title}</p>
        <p className="text-body text-text-muted">{description}</p>
        {referenceId ? (
          <p className="text-caption text-text-subtle">
            Reference <span className="font-mono">{referenceId}</span>
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Permission: explain the restriction and suggest who to ask. */
export function PermissionState({ requiredRole, className }: { requiredRole: string; className?: string }) {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You do not have access to this page"
      description={`This page is available to workspace ${requiredRole}s. Ask your workspace owner or an admin to change your role.`}
      className={className}
    />
  );
}

const BANNER_TONES = {
  warning: { icon: AlertTriangle, className: "border-warning/30 bg-warning-soft text-text" },
  info: { icon: Info, className: "border-info/30 bg-info-soft text-text" },
  danger: { icon: OctagonAlert, className: "border-danger/30 bg-danger-soft text-text" },
} as const;

/** Partial/degraded banner: shadow mode, paused mailbox, AI fallback, plan limits. */
export function Banner({
  tone = "warning",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof BANNER_TONES;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = BANNER_TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-3 rounded-card border px-4 py-3 sm:flex-row sm:items-center",
        toneClass,
        className,
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon
          aria-hidden
          className={cn(
            "mt-0.5 size-4 shrink-0 stroke-[1.75]",
            tone === "warning" ? "text-warning" : tone === "info" ? "text-info" : "text-danger",
          )}
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-body font-medium">{title}</p>
          {children ? <div className="text-small text-text-muted">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 sm:ml-auto">{action}</div> : null}
    </div>
  );
}
