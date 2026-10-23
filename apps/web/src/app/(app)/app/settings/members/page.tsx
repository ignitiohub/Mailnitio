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
import { MailPlus, ShieldAlert, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { canManageWorkspace, useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
  inviterName: string | null;
}

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
  const { data, error, loading, refetch, mutate } = useApi<{ data: Member[]; nextCursor: string | null }>(
    path,
  );
  const invitations = useApi<{ data: Invitation[] }>("/v1/workspace/invitations");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const manage = canManageWorkspace(me.role);

  function failed(e: unknown, fallback: string) {
    toast.error(e instanceof ApiError ? e.message : fallback, {
      description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
    });
  }

  // Optimistic role change with rollback.
  async function changeRole(member: Member, role: WorkspaceRole) {
    const setRole = (r: WorkspaceRole) =>
      mutate((c) =>
        c ? { ...c, data: c.data.map((m) => (m.id === member.id ? { ...m, role: r } : m)) } : c,
      );
    setRole(role);
    try {
      await apiFetch(`/v1/workspace/members/${member.id}`, { method: "PATCH", json: { role } });
      toast.success(`${member.name} is now ${ROLE_LABELS[role].toLowerCase()}`);
    } catch (e) {
      setRole(member.role);
      failed(e, "Could not change the role");
    }
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await apiFetch(`/v1/workspace/members/${removing.id}`, { method: "DELETE" });
      toast.success(`${removing.name} removed from ${me.workspace.name}`);
      setRemoving(null);
      refetch();
    } catch (e) {
      failed(e, "Could not remove the member");
    } finally {
      setRemoveBusy(false);
    }
  }

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
      cell: ({ row }) => {
        const m = row.original;
        const editable = manage && m.userId !== me.user.id && (m.role !== "owner" || me.role === "owner");
        if (!editable) {
          return <Badge tone={m.role === "owner" ? "primary" : "neutral"}>{ROLE_LABELS[m.role]}</Badge>;
        }
        return (
          <Select
            aria-label={`Role for ${m.name}`}
            value={m.role}
            className="h-8 w-40"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => void changeRole(m, e.target.value as WorkspaceRole)}
          >
            {WORKSPACE_ROLES.filter((r) => r !== "owner" || me.role === "owner").map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        );
      },
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
    ...(manage
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            enableHiding: false,
            meta: { align: "right" as const, mobile: "meta" as const, label: "Actions" },
            cell: ({ row }: { row: { original: Member } }) =>
              row.original.userId !== me.user.id && (row.original.role !== "owner" || me.role === "owner") ? (
                <Button variant="ghost" size="sm" onClick={() => setRemoving(row.original)}>
                  <UserMinus aria-hidden />
                  Remove
                </Button>
              ) : null,
          } satisfies ColumnDef<Member, unknown>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-text-muted">People who can sign in to {me.workspace.name}.</p>
        {canManageWorkspace(me.role) ? (
          <InviteMember
            onInvited={() => {
              refetch();
              invitations.refetch();
            }}
          />
        ) : null}
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
      {(invitations.data?.data.length ?? 0) > 0 ? (
        <section aria-labelledby="pending-invitations" className="flex flex-col gap-3">
          <h2 id="pending-invitations" className="text-h4 text-text">
            Pending invitations
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
            {invitations.data?.data.map((i) => (
              <li key={i.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
                <MailPlus aria-hidden className="hidden size-4 text-text-subtle sm:block" />
                <span className="min-w-0 flex-1 truncate text-body text-text">{i.email}</span>
                <span className="text-small text-text-muted">
                  {ROLE_LABELS[i.role] ?? i.role} · invited by {i.inviterName ?? "a teammate"} · expires{" "}
                  {formatDateTime(i.expiresAt, me.workspace.timezone)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Modal
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? ""} from ${me.workspace.name}?`}
        description="They lose access straight away. Their open tickets become unassigned and they leave every team. This is recorded in the audit log."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep member
            </Button>
            <Button variant="destructive" loading={removeBusy} onClick={() => void remove()}>
              Remove member
            </Button>
          </>
        }
      />
    </div>
  );
}
