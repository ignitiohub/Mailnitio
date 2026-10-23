import { Button } from "@mailnitio/ui";
import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Mailboxes and connections" };

export default function MailboxesandconnectionsPage() {
  return (
    <ModuleEmpty
      title="Mailboxes and connections"
      description="The support addresses Mailnitio reads, and their connection status."
      icon={Mail}
      emptyTitle="No mailboxes connected"
      emptyDescription="During setup, Mailnitio staff connect your Microsoft 365 mailbox in shadow mode first. Self-serve connection arrives later."
      action={
        <Button asChild>
          <Link href="/demo?offer=setup">Request setup</Link>
        </Button>
      }
    />
  );
}
