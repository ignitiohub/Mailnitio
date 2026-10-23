"use client";

import { ROLE_LABELS, WORKSPACE_ROLES, type WorkspaceRole } from "@mailnitio/shared";
import {
  Badge,
  Banner,
  Button,
  DataTable,
  Field,
  formatDateTime,
  formatRelativeTime,
  Input,
  Modal,
  Select,
  toast,
} from "@mailnitio/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { canManageWorkspace, useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  twoFactorEnabled: boolean;
  joinedAt: string;
}

function InviteMember({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("agent");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    const { error: inviteError } = await authClient.organization.inviteMember({
      email,
      role: role as "admin",
    });
    setSending(false);
    if (inviteError) {
      setError(authErrorMessage(inviteError));
      return;
    }
    toast.success(`Invitation sent to ${email}`);
    setEmail("");
    setOpen(false);
    onInvited();
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Invite a member"
      description="They will get an email with a link to join this workspace. Invitations expire after 7 days."
      trigger={
        <Button>
          <UserPlus aria-hidden />
          Invite member
        </Button>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" required error={error}>
          <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role" helper="Owners and admins must use two-factor authentication.">
          <Select value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
            {WORKSPACE_ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={sending}>
            Send invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MembersPage() {
  const { me } = useMe();
  const [cursors, setCursors] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const cursor = cursors.at(-1);
  const path = `/v1/workspace/members?limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const { data, error, loading, refetch } = useApi<{ data: Member[]; nextCursor: string | null }>(path);

  const columns: ColumnDef<Member, unknown>[] = [
    {
      id: "name",
      header: "Name",
      meta: { mobile: "title", label: "Name" },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">
            {row.original.name}
            {row.original.userId === me.user.id ? (
              <span className="font-normal text-text-subtle"> (you)</span>
            ) : null}
          </span>
          <span className="text-small text-text-muted">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      meta: { mobile: "status", label: "Role" },
      cell: ({ row }) => (
        <Badge tone={row.original.role === "owner" ? "primary" : "neutral"}>
          {ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    },
    {
      id: "mfa",
      header: "Two-factor",
      meta: { mobile: "meta", label: "Two-factor" },
      cell: ({ row }) =>
        row.original.twoFactorEnabled ? (
          <span className="inline-flex items-center gap-1.5 text-small text-success">
            <ShieldCheck aria-hidden className="size-4 stroke-[1.75]" />
            On
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-small text-text-muted">
            <ShieldAlert aria-hidden className="size-4 stroke-[1.75]" />
            Off
          </span>
        ),
    },
    {
      id: "joined",
      header: "Joined",
      meta: { mobile: "meta", label: "Joined" },
      cell: ({ row }) => (
        <time
          dateTime={row.original.joinedAt}
          title={formatDateTime(row.original.joinedAt, me.workspace.timezone)}
          className="tabular"
        >
          {formatRelativeTime(row.original.joinedAt)}
        </time>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-text-muted">People who can sign in to {me.workspace.name}.</p>
        {canManageWorkspace(me.role) ? <InviteMember onInvited={refetch} /> : null}
      </div>
      {!canManageWorkspace(me.role) ? (
        <Banner tone="info" title="Only owners and admins can invite or remove members." />
      ) : null}
      <DataTable
        caption="Workspace members"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        loading={loading}
        error={error ? { message: error.message, referenceId: error.referenceId, onRetry: refetch } : null}
        empty={{
          icon: Users,
          title: "No members yet",
          description: "Invite colleagues to work in this workspace.",
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
    </div>
  );
}
