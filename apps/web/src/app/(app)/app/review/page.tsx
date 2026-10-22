import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Needs review" };

export default function NeedsreviewPage() {
  return (
    <ModuleEmpty
      title="Needs review"
      description="Emails the AI was not confident about, waiting for a person to decide."
      icon={ListChecks}
      emptyTitle="Nothing to review"
      emptyDescription="When the AI is unsure how to route an email, it will wait here for a reviewer instead of guessing."
    />
  );
}
