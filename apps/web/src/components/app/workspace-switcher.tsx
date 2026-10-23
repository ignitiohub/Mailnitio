"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  toast,
} from "@mailnitio/ui";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/lib/me";

interface WorkspaceItem {
  id: string;
  name: string;
}

/** Lists the workspaces the user belongs to and switches the session's active workspace. */
export function WorkspaceSwitcher() {
  const { me } = useMe();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[] | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    void authClient.organization.list().then(({ data }) => {
      if (data) setWorkspaces(data.map((w) => ({ id: w.id, name: w.name })));
    });
  }, []);

  async function switchTo(id: string) {
    if (id === me.workspace.id) return;
    setSwitching(true);
    const { error } = await authClient.organization.setActive({ organizationId: id });
    if (error) {
      setSwitching(false);
      toast.error("Could not switch workspace. Try again.");
      return;
    }
    // A full reload drops every cached query from the previous workspace.
    window.location.assign("/app");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full cursor-pointer items-center gap-2 rounded-card border border-border bg-surface-2 px-3 py-2 text-left hover:border-border-strong disabled:cursor-wait max-md:min-h-11"
        disabled={switching}
        aria-label={`Workspace: ${me.workspace.name}. Switch workspace`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-overline text-text-subtle uppercase">Workspace</span>
          <span className="truncate text-body font-medium text-text">{me.workspace.name}</span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 stroke-[1.75] text-text-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {(workspaces ?? [{ id: me.workspace.id, name: me.workspace.name }]).map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => void switchTo(w.id)}>
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === me.workspace.id ? <Check aria-label="Current workspace" className="!text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
