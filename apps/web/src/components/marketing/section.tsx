import { cn } from "@mailnitio/ui";
import type { ReactNode } from "react";

/** Marketing section: 96px vertical padding on desktop, 64px on mobile, 1200px max content width. */
export function Section({
  children,
  tone = "default",
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "brand";
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "py-16 md:py-24",
        tone === "muted" && "border-y border-border bg-surface-2/60",
        tone === "default" && "bg-surface",
        tone === "brand" && "bg-primary-soft",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">{children}</div>
    </section>
  );
}

export function SectionHeading({
  id,
  overline,
  title,
  description,
  align = "left",
  as: Heading = "h2",
}: {
  id?: string;
  overline?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" && "mx-auto items-center text-center",
      )}
    >
      {overline ? <p className="text-overline text-primary uppercase">{overline}</p> : null}
      <Heading
        id={id}
        className={cn("text-text", Heading === "h1" ? "text-h1 md:text-display" : "text-h2 md:text-h1")}
      >
        {title}
      </Heading>
      {description ? <p className="text-body-lg text-text-muted">{description}</p> : null}
    </div>
  );
}

/** Product UI shown in a subtle browser frame. */
export function BrowserFrame({
  children,
  url,
  className,
}: {
  children: ReactNode;
  url: string;
  className?: string;
}) {
  return (
    <figure
      className={cn("overflow-hidden rounded-card border border-border bg-surface shadow-md", className)}
    >
      <div className="flex h-9 items-center gap-3 border-b border-border bg-surface-2 px-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="flex-1 truncate rounded-control bg-surface px-2 py-0.5 text-center font-mono text-[11px] text-text-subtle">
          {url}
        </span>
      </div>
      {children}
    </figure>
  );
}

export function FeatureGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-4 md:gap-6",
        columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6">
      <span className="flex size-9 items-center justify-center rounded-control bg-primary-soft text-primary [&_svg]:size-5 [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <h3 className="text-h4 text-text">{title}</h3>
      <div className="text-body text-text-muted">{children}</div>
    </div>
  );
}
