import { LayoutTemplate } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <ModuleEmpty
      title="Templates"
      description="Reusable email designs for statements, notices and campaigns."
      icon={LayoutTemplate}
      emptyTitle="No templates yet"
      emptyDescription="Templates you create will appear here, ready to use in any campaign."
    />
  );
}
