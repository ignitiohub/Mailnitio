"use client";

import { AiCard, Button, Card, Field, formatDateTime, formatNumber, Select, toast } from "@mailnitio/ui";
import { Mail, Phone, Plus, Tag, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/me";
import { formatUsd, PRIORITY_LABELS, SlaTimer, TICKET_STATUS_LABELS, TicketKey, TicketStatusChip } from "./display";
import { useLookups } from "./lookups";
import type { TicketDetail } from "./ticket-types";

type Patch = Partial<Pick<TicketDetail, "status" | "priority" | "teamId" | "assigneeId" | "tags">>;

const REPLY_TYPE: Record<string, string> = {
  continuation: "Continuation of the conversation",
  closure: "Closing the conversation",
  new_issue: "New issue",
  escalation: "Escalation",
  mixed: "Thanks plus a new issue",
};

/**
 * Ticket properties with optimistic updates: the change shows immediately and rolls back with an error
 * toast if the API refuses it.
 */
export function TicketPanel({
  ticket,
  editable,
  onChange,
  onLink,
}: {
  ticket: TicketDetail;
  editable: boolean;
  onChange: (updater: (t: TicketDetail) => TicketDetail) => void;
  onLink: () => void;
}) {
  const { me } = useMe();
  const { teams, members, categoryLabel } = useLookups();
  const [tag, setTag] = useState("");

  async function update(patch: Patch, message: string) {
    const before = ticket;
    const teamName = patch.teamId !== undefined ? (teams.find((t) => t.id === patch.teamId)?.name ?? null) : ticket.teamName;
    const assigneeName =
      patch.assigneeId !== undefined ? (members.find((m) => m.userId === patch.assigneeId)?.name ?? null) : ticket.assigneeName;
    onChange((t) => ({ ...t, ...patch, teamName, assigneeName }));
    try {
      await apiFetch(`/v1/tickets/${ticket.id}`, { method: "PATCH", json: patch });
      toast.success(message);
    } catch (e) {
      onChange(() => before);
      toast.error(e instanceof ApiError ? e.message : "Could not update the ticket", {
        description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
      });
    }
  }

  function addTag(event: FormEvent) {
    event.preventDefault();
    const value = tag.trim().toLowerCase();
    if (!value || ticket.tags.includes(value)) return;
    setTag("");
    void update({ tags: [...ticket.tags, value] }, `Tag “${value}” added`);
  }

  const ai = ticket.ai;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-h4 text-text">Details</h2>
          <TicketStatusChip status={ticket.status} />
        </div>
        <Field label="Status">
          <Select
            value={ticket.status}
            disabled={!editable}
            onChange={(e) => void update({ status: e.target.value }, `Status set to ${TICKET_STATUS_LABELS[e.target.value]}`)}
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            value={ticket.priority}
            disabled={!editable}
            onChange={(e) => void update({ priority: e.target.value }, `Priority set to ${PRIORITY_LABELS[e.target.value]}`)}
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Team">
          <Select
            value={ticket.teamId ?? ""}
            disabled={!editable}
            onChange={(e) => void update({ teamId: e.target.value || null }, "Team updated")}
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Assignee"
          helper={
            editable && ticket.assigneeId !== me.user.id ? (
              <button
                type="button"
                className="cursor-pointer text-primary hover:underline"
                onClick={() => void update({ assigneeId: me.user.id }, "Assigned to you")}
              >
                Assign to me <kbd className="font-mono text-text-subtle">e</kbd>
              </button>
            ) : undefined
          }
        >
          <Select
            value={ticket.assigneeId ?? ""}
            disabled={!editable}
            onChange={(e) => void update({ assigneeId: e.target.value || null }, e.target.value ? "Assignee updated" : "Unassigned")}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium text-text">Tags</span>
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {ticket.tags.length === 0 ? <li className="text-small text-text-subtle">No tags</li> : null}
            {ticket.tags.map((t) => (
              <li key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-2.5 text-small text-text">
                <Tag aria-hidden className="size-3 text-text-subtle" />
                {t}
                {editable ? (
                  <button
                    type="button"
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-border"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => void update({ tags: ticket.tags.filter((x) => x !== t) }, `Tag “${t}” removed`)}
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {editable ? (
            <form onSubmit={addTag} className="flex gap-2">
              <label htmlFor="add-tag" className="sr-only">
                Add a tag
              </label>
              <input
                id="add-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                maxLength={40}
                placeholder="Add a tag"
                className="h-8 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-2.5 text-small text-text max-md:h-11"
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!tag.trim()}>
                Add
              </Button>
            </form>
          ) : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-h4 text-text">SLA</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
          <dt className="text-text-muted">First response</dt>
          <dd className="text-right">
            <SlaTimer due={ticket.firstResponseDue} respondedAt={ticket.firstRespondedAt} status={ticket.status} />
          </dd>
          <dt className="text-text-muted">Resolution due</dt>
          <dd className="text-right text-text tabular">{ticket.resolutionDue ? formatDateTime(ticket.resolutionDue, me.workspace.timezone) : "None"}</dd>
          <dt className="text-text-muted">Opened</dt>
          <dd className="text-right text-text tabular">{formatDateTime(ticket.createdAt, me.workspace.timezone)}</dd>
          {ticket.reopenedCount > 0 ? (
            <>
              <dt className="text-text-muted">Reopened</dt>
              <dd className="text-right text-text tabular">{formatNumber(ticket.reopenedCount)} time(s)</dd>
            </>
          ) : null}
        </dl>
      </Card>

      {ticket.customer ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h4 text-text">Customer</h2>
            <Link href={`/app/customers/${ticket.customer.id}`} className="text-small text-primary hover:underline">
              View profile
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-body font-medium text-text">{ticket.customer.name ?? ticket.customer.email}</span>
            <span className="flex items-center gap-1.5 text-small text-text-muted">
              <Mail aria-hidden className="size-3.5" />
              {ticket.customer.email}
            </span>
            {ticket.customer.phone ? (
              <span className="flex items-center gap-1.5 text-small text-text-muted">
                <Phone aria-hidden className="size-3.5" />
                {ticket.customer.phone}
              </span>
            ) : null}
          </div>
          <p className="text-small text-text-muted tabular">
            {formatNumber(ticket.customer.ticketCount)} tickets · {formatNumber(ticket.customer.openCount)} open
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <h2 className="text-h4 text-text">Customer</h2>
          <p className="mt-1 text-small text-text-muted">The sender could not be matched to a customer. Set the customer from Needs review.</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-h4 text-text">Linked tickets</h2>
          {editable ? (
            <Button variant="ghost" size="sm" onClick={onLink}>
              <Plus aria-hidden />
              Link
            </Button>
          ) : null}
        </div>
        {ticket.related.length === 0 ? (
          <p className="text-small text-text-subtle">No linked tickets</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ticket.related.map((r) => (
              <li key={r.id}>
                <Link href={`/app/tickets/${r.id}`} className="flex items-center gap-2 rounded-control p-1 hover:bg-surface-2">
                  <TicketKey value={r.key} />
                  <span className="min-w-0 flex-1 truncate text-small text-text">{r.subject}</span>
                  <TicketStatusChip status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {ai ? (
        <AiCard
          category={categoryLabel(ai.category)}
          confidence={ai.confidence ?? 0}
          reason={ai.aiReason ?? "No reason recorded"}
          replyType={ai.replyType ? (REPLY_TYPE[ai.replyType] ?? ai.replyType) : ai.rerouted ? "New ticket, rerouted" : "New ticket"}
          model={ai.model ?? "Not recorded"}
          cost={formatUsd(ai.costUsd)}
        />
      ) : null}
      {ai?.emailLogId ? (
        <Link href={`/app/inbox-log/${ai.emailLogId}`} className="text-small text-primary hover:underline">
          See the full decision trail
        </Link>
      ) : null}
    </div>
  );
}
