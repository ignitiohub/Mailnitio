import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Title + description, with the single primary action on the right (sticky at the bottom on mobile). */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb ? <div className="text-caption font-normal text-text-subtle">{breadcrumb}</div> : null}
        <h1 className="text-h2 text-text md:text-h1">{title}</h1>
        {description ? <p className="prose-width text-body text-text-muted">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-16 max-md:z-30 max-md:border-t max-md:border-border max-md:bg-surface max-md:p-3 max-md:[&>*]:flex-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
