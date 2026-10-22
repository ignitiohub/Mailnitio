import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Mailboxes" };

export default function MailboxesPage() {
  return (
    <ModuleEmpty
      title="Mailboxes"
      description="The support addresses Mailnitio reads, such as support@ or complaints@."
      icon={Mail}
      emptyTitle="No mailboxes connected"
      emptyDescription="Microsoft 365 mailbox connections arrive in the next release. We will email you when they are ready."
    />
  );
}
