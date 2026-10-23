"use client";

import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@mailnitio/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { canAdmin, canManage } from "@/components/helpdesk/display";
import { CannedTab, CategoriesTab, RulesTab } from "@/components/helpdesk/setup-rules";
import { TeamsTab } from "@/components/helpdesk/setup-teams";
import { useMe } from "@/lib/me";

const TABS = [
  { id: "teams", label: "Teams" },
  { id: "categories", label: "Categories" },
  { id: "rules", label: "Thresholds and escalation" },
  { id: "canned", label: "Canned responses" },
] as const;

function TeamsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { me } = useMe();
  const tab = TABS.find((t) => t.id === params.get("tab"))?.id ?? "teams";
  const admin = canAdmin(me.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams, rules and categories"
        description={`Your teams, the categories that route to them, thresholds and escalation terms.${admin ? "" : " Only owners and admins can change routing."}`}
      />
      <Tabs value={tab} onValueChange={(v) => router.replace(`/app/teams?tab=${v}`, { scroll: false })}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList aria-label="Setup sections">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="teams" className="mt-6">
          <TeamsTab editable={admin} />
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          <CategoriesTab editable={admin} />
        </TabsContent>
        <TabsContent value="rules" className="mt-6">
          <RulesTab editable={admin} />
        </TabsContent>
        <TabsContent value="canned" className="mt-6">
          <CannedTab editable={canManage(me.role)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense>
      <TeamsScreen />
    </Suspense>
  );
}
