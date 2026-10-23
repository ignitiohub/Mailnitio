"use client";

import type { WorkspaceRole } from "@mailnitio/shared";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";
import { useApi } from "@/lib/use-api";

export interface CategoryOption {
  key: string;
  label: string;
  description: string;
  team: string;
  defaultPriority: string;
  include: string[];
  exclude: string[];
}

export interface TeamOption {
  id: string;
  key: string;
  name: string;
  emailAlias: string | null;
  autoAssign: string;
  openTickets: number;
  isEscalationTeam: boolean;
  members: { userId: string; name: string; role: string }[];
  categories: { key: string; label: string }[];
}

export interface MemberOption {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
}

export interface TenantConfigView {
  displayName: string;
  industry: string;
  categories: CategoryOption[];
  defaultCategory: string;
  thresholds: { high: number; low: number; spam: number; context: number };
  escalation: { terms: string[]; team: string };
}

interface Lookups {
  config: TenantConfigView | null;
  configVersion: number | null;
  teams: TeamOption[];
  members: MemberOption[];
  ready: boolean;
  categoryLabel: (key: string | null | undefined) => string;
  teamByKey: (key: string | null | undefined) => TeamOption | undefined;
  refresh: () => void;
}

const LookupsContext = createContext<Lookups | null>(null);

/** Workspace configuration, teams and members, loaded once for labels and pickers across the portal. */
export function LookupsProvider({ children }: { children: ReactNode }) {
  const config = useApi<{ data: { version: number; config: TenantConfigView } }>("/v1/config");
  const teams = useApi<{ data: TeamOption[] }>("/v1/teams");
  const members = useApi<{ data: MemberOption[] }>("/v1/workspace/members?limit=100");
  const refresh = useCallback(() => {
    config.refetch();
    teams.refetch();
    members.refetch();
  }, [config.refetch, teams.refetch, members.refetch]);

  const value = useMemo<Lookups>(() => {
    const categories = config.data?.data.config.categories ?? [];
    const teamList = teams.data?.data ?? [];
    return {
      config: config.data?.data.config ?? null,
      configVersion: config.data?.data.version ?? null,
      teams: teamList,
      members: members.data?.data ?? [],
      ready: !config.loading && !teams.loading && !members.loading,
      categoryLabel: (key) =>
        key ? (categories.find((c) => c.key === key)?.label ?? key.replaceAll("_", " ")) : "Unclassified",
      teamByKey: (key) => teamList.find((t) => t.key === key),
      refresh,
    };
  }, [config.data, config.loading, teams.data, teams.loading, members.data, members.loading, refresh]);

  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>;
}

export function useLookups(): Lookups {
  const ctx = useContext(LookupsContext);
  if (!ctx) throw new Error("useLookups must be used inside LookupsProvider");
  return ctx;
}
