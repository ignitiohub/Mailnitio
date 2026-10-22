"use client";

import { DataTable, formatDateTime, formatRelativeTime, PermissionState } from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { ScrollText } from "lucide-react";
import { useState } from "react";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface AuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "workspace.created": "Workspace created",
  "workspace.updated": "Workspace details changed",
  "workspace.onboarded": "Workspace set up",
  "auth.sign_in": "Signed in",
  "auth.sign_out": "Signed out",
  "auth.mfa_enabled": "Two-factor authentication turned on",
  "auth.mfa_disabled": "Two-factor authentication turned off",
  "auth.mfa_verified": "Two-factor code verified",
  "auth.password_changed": "Password changed",
  "auth.password_reset": "Password reset",
  "auth.email_verified": "Email address verified",
  "member.added": "Member added",
  "member.removed": "Member removed",
  "member.role_changed": "Member role changed",
  "member.invited": "Member invited",
};

export default function AuditLogPage() {
  const { me } = useMe();
  const allowed = ["owner", "admin", "supervisor"].includes(me.role);
  const [cursors, setCursors] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const cursor = cursors.at(-1);
  const { data, error, loading, refetch } = useApi<{ data: AuditEntry[]; nextCursor: string | null }>(
    allowed
      ? `/v1/workspace/audit-log?limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      : null,
  );

  if (!allowed) return <PermissionState requiredRole="owner, admin or supervisor" />;

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    {
      id: "action",
      header: "Event",
      enableHiding: false,
      meta: { mobile: "title", label: "Event" },
      cell: ({ row }) => ACTION_LABELS[row.original.action] ?? row.original.action,
    },
    {
      id: "actor",
      header: "By",
      meta: { mobile: "meta", label: "By" },
      cell: ({ row }) => row.original.actorName ?? "System",
    },
    {
      id: "ip",
      header: "IP address",
      meta: { mobile: "hidden", label: "IP address" },
      cell: ({ row }) => (
        <span className="font-mono text-small text-text-muted">{row.original.ipAddress ?? "None"}</span>
      ),
    },
    {
      id: "when",
      header: "When",
      meta: { mobile: "meta", label: "When" },
      cell: ({ row }) => (
        <time
          dateTime={row.original.createdAt}
          title={formatDateTime(row.original.createdAt, me.workspace.timezone)}
          className="tabular"
        >
          {formatRelativeTime(row.original.createdAt)}
        </time>
      ),
    },
  ];

  return (
    <DataTable
      caption="Audit log"
      columns={columns}
      data={data?.data ?? []}
      getRowId={(row) => row.id}
      loading={loading}
      error={error ? { message: error.message, referenceId: error.referenceId, onRetry: refetch } : null}
      empty={{
        icon: ScrollText,
        title: "No events yet",
        description: "Sign-ins, setting changes and member changes will be recorded here.",
      }}
      pagination={{
        pageSize,
        onPageSizeChange: (size) => {
          setPageSize(size);
          setCursors([]);
        },
        hasPrevious: cursors.length > 0,
        hasNext: Boolean(data?.nextCursor),
        onPrevious: () => setCursors((c) => c.slice(0, -1)),
        onNext: () => data?.nextCursor && setCursors((c) => [...c, data.nextCursor as string]),
      }}
    />
  );
}
