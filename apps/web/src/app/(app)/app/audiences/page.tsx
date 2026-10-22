import { Users } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Audiences" };

export default function AudiencesPage() {
  return (
    <ModuleEmpty
      title="Audiences"
      description="Contact lists and segments for your campaigns."
      icon={Users}
      emptyTitle="No audiences yet"
      emptyDescription="Import contacts from a CSV file to build your first audience."
    />
  );
}
