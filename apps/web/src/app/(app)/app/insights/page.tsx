import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Insight report" };

export default function InsightreportPage() {
  return (
    <ModuleEmpty
      title="Insight report"
      description="Upload past emails to see topics, volumes, misrouting and auto-answer candidates."
      icon={ChartColumn}
      emptyTitle="No insight reports yet"
      emptyDescription="Insight reports arrive in a later release. Ask us for one during your pilot."
    />
  );
}
