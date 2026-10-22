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
      emptyDescription="Tickets appear here once a support mailbox is connected. Mailnitio staff connect mailboxes during setup."
      action={
        <Button asChild>
          <Link href="/demo?offer=setup">Request setup</Link>
        </Button>
      }
    />
  );
}
