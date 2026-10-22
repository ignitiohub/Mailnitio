import { Button } from "@mailnitio/ui";
import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Inbox log" };

export default function InboxlogPage() {
  return (
    <ModuleEmpty
      title="Inbox log"
      description="Every email Mailnitio has read, with the decision it made and why."
      icon={ScrollText}
      emptyTitle="No emails processed yet"
      emptyDescription="Each email Mailnitio reads will appear here with its category, confidence and decision trail."
      action={
        <Button asChild>
          <Link href="/app/mailboxes">Connect a mailbox</Link>
        </Button>
      }
    />
  );
}
