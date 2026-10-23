import { Gauge } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Usage" };

export default function UsagePage() {
  return (
    <ModuleEmpty
      title="Usage"
      description="Emails processed, AI cost and sends for this workspace."
      icon={Gauge}
      emptyTitle="No usage yet"
      emptyDescription="Usage appears here once Mailnitio starts processing or sending email for this workspace."
    />
  );
}
