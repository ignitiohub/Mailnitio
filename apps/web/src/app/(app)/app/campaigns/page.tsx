import { Send } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <ModuleEmpty
      title="Campaigns"
      description="Bulk sends to your audiences, with a live monitor for each send."
      icon={Send}
      emptyTitle="No campaigns yet"
      emptyDescription="Send is opening soon. You will be able to build and monitor campaigns here."
    />
  );
}
