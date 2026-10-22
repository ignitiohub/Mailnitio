import { Card } from "@mailnitio/ui";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text">{title}</h1>
          {description ? <p className="text-body text-text-muted">{description}</p> : null}
        </div>
        {children}
      </Card>
      {footer ? <p className="text-center text-body text-text-muted">{footer}</p> : null}
    </div>
  );
}
