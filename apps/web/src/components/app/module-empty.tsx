import { Card, EmptyState, PageHeader } from "@mailnitio/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Screens for modules that have no data yet: page header plus an empty state with the next action. */
export function ModuleEmpty({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} action={action} />
      </Card>
    </div>
  );
}
