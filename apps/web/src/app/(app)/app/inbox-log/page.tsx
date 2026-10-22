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
      description="Every email Mailnitio has read, with its category, confidence and decision."
      icon={ScrollText}
      emptyTitle="No emails processed yet"
      emptyDescription="Each email Mailnitio reads will appear here with its decision trail once a mailbox is connected."
      action={
        <Button asChild>
          <Link href="/demo?offer=setup">Request setup</Link>
        </Button>
      }
    />
  );
}
