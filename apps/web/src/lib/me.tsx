"use client";

import type { WorkspaceRole } from "@mailnitio/shared";
import { createContext, type ReactNode, useContext } from "react";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  industry: string | null;
  timezone: string;
  productInterest: "helpdesk" | "send" | "both" | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface Me {
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  role: WorkspaceRole;
  mfaRequired: boolean;
  mfaRequiredForRole: boolean;
  workspace: Workspace;
}

const MeContext = createContext<{ me: Me; refresh: () => void } | null>(null);

export function MeProvider({ me, refresh, children }: { me: Me; refresh: () => void; children: ReactNode }) {
  return <MeContext.Provider value={{ me, refresh }}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside the app shell");
  return ctx;
}

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}
