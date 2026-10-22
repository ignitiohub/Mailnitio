import { Button } from "@mailnitio/ui";
import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return (
    <ModuleEmpty
      title="Training"
      description="Teach Mailnitio your categories and teams from emails you have already handled."
      icon={GraduationCap}
      emptyTitle="No training data yet"
      emptyDescription="Connect a mailbox first. Mailnitio can then learn from your past emails to suggest categories and routing."
      action={
        <Button asChild>
          <Link href="/app/mailboxes">Connect a mailbox</Link>
        </Button>
      }
    />
  );
}
