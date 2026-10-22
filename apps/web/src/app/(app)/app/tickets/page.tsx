import { Button } from "@mailnitio/ui";
import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage() {
  return (
    <ModuleEmpty
      title="Tickets"
      description="Customer emails turned into tickets and routed to your teams."
      icon={Inbox}
      emptyTitle="No tickets yet"
      emptyDescription="Connect a support mailbox and Mailnitio will create tickets from new customer emails."
      action={
        <Button asChild>
          <Link href="/app/mailboxes">Connect a mailbox</Link>
        </Button>
      }
    />
  );
}
