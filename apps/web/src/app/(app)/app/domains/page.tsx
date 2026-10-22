import { Globe } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Domains" };

export default function DomainsPage() {
  return (
    <ModuleEmpty
      title="Domains"
      description="Sending domains for Mailnitio Send, with SPF, DKIM and DMARC checks."
      icon={Globe}
      emptyTitle="No sending domains"
      emptyDescription="Sending domain setup arrives with Mailnitio Send. We will email you when it is ready."
    />
  );
}
