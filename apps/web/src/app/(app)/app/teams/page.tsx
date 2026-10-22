import { Button } from "@mailnitio/ui";
import { Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Teams, rules and categories" };

export default function TeamsrulesandcategoriesPage() {
  return (
    <ModuleEmpty
      title="Teams, rules and categories"
      description="Your teams, the categories that route to them, thresholds and escalation terms."
      icon={Workflow}
      emptyTitle="No teams yet"
      emptyDescription="Teams and routing rules are configured during setup, from your industry pack and your own email history."
      action={
        <Button asChild>
          <Link href="/demo?offer=setup">Request setup</Link>
        </Button>
      }
    />
  );
}
