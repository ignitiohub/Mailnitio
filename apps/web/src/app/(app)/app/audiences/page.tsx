import { Users } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Audiences and templates" };

export default function AudiencesandtemplatesPage() {
  return (
    <ModuleEmpty
      title="Audiences and templates"
      description="Contact lists, segments and the email templates you send to them."
      icon={Users}
      emptyTitle="No audiences yet"
      emptyDescription="Send is opening soon. Audiences and templates will appear here when it does."
    />
  );
}
