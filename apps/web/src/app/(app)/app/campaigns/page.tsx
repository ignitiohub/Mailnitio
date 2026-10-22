import { Button } from "@mailnitio/ui";
import { Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <ModuleEmpty
      title="Campaigns"
      description="Bulk sends to your audiences, with a live monitor for each send."
      icon={Send}
      emptyTitle="No campaigns yet"
      emptyDescription="Verify a sending domain, then create your first campaign from a template."
      action={
        <Button asChild>
          <Link href="/app/domains">Add a sending domain</Link>
        </Button>
      }
    />
  );
}
