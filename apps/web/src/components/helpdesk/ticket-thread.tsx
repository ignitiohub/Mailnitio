"use client";

import { cn, formatDateTime } from "@mailnitio/ui";
import { ArrowDownLeft, ArrowUpRight, Bot, StickyNote } from "lucide-react";
import { useMe } from "@/lib/me";
import { PRIORITY_LABELS, TICKET_STATUS_LABELS } from "./display";
import { useLookups } from "./lookups";
import type { TicketDetail, TicketEvent, TicketMessage } from "./ticket-types";

function describeEvent(e: TicketEvent, memberName: (id: string) => string | undefined): string | null {
  const who = e.actorType === "ai" ? "Mailnitio" : (e.actorName ?? "System");
  const d = e.data;
  switch (e.type) {
    case "created":
      return d.splitFrom ? `${who} split this from ${d.splitFrom}` : `Mailnitio created the ticket for ${String(d.team ?? "a team")}`;
    case "status":
      return `${who} changed status to ${TICKET_STATUS_LABELS[String(d.to)] ?? d.to}`;
    case "priority":
      return `${who} set priority to ${PRIORITY_LABELS[String(d.to)] ?? d.to}`;
    case "team":
      return `${who} moved the ticket to ${String(d.to)}`;
    case "assignee":
      return d.to ? `${who} assigned the ticket to ${memberName(String(d.to)) ?? "a teammate"}` : `${who} unassigned the ticket`;
    case "tags":
      return `${who} updated tags`;
    case "reopened":
      return "Reopened: the customer replied within the reopen window";
    case "linked":
      return d.with ? `${who} linked ${String(d.with)}` : "Mailnitio linked a related ticket";
    case "merged":
      return d.into ? `${who} merged this into ${String(d.into)}` : `${who} merged ${String(d.from)} into this ticket`;
    case "split":
      return `${who} split ${String(d.messages)} message(s) into ${String(d.into)}`;
    case "review":
      return d.result === "approved" ? `${who} approved the AI decision` : `${who} changed the AI decision`;
    case "ai":
      return `Mailnitio routed to ${String(d.team)}${d.reason ? `: ${String(d.reason)}` : ""}`;
    default:
      return null;
  }
}

function Message({ m, timezone, mailbox }: { m: TicketMessage; timezone: string; mailbox: string | null }) {
  const note = m.direction === "note";
  const outbound = m.direction === "outbound";
  const system = m.authorType === "system";
  const Icon = note ? StickyNote : system ? Bot : outbound ? ArrowUpRight : ArrowDownLeft;
  const label = note ? "Internal note" : system ? "Acknowledgement" : outbound ? "Reply" : "Customer email";
  return (
    <article
      aria-label={`${label} from ${m.fromName ?? m.fromAddr ?? "unknown"}`}
      className={cn(
        "flex flex-col gap-2 rounded-card border p-4",
        note ? "border-warning/30 bg-warning-soft" : outbound ? "border-primary/20 bg-primary-soft/50" : "border-border bg-surface",
        outbound && "md:ml-10",
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-body font-medium text-text">
          <Icon aria-hidden className={cn("size-4 stroke-[1.75]", note ? "text-warning" : outbound ? "text-primary" : "text-text-muted")} />
          {m.fromName ?? m.fromAddr ?? "Unknown sender"}
          {!note && m.fromAddr && m.fromName ? <span className="text-small font-normal text-text-subtle">{m.fromAddr}</span> : null}
        </span>
        <time dateTime={m.createdAt} className="text-caption font-normal text-text-subtle tabular">
          {formatDateTime(m.createdAt, timezone)}
        </time>
      </header>
      <p className="prose-width text-body whitespace-pre-wrap text-text">{m.bodyText}</p>
      {outbound ? (
        <p className="text-caption font-normal text-text-subtle">
          {label} {m.sentStatus === "simulated" ? `recorded (sending from ${m.fromAddr ?? mailbox ?? "the mailbox"} starts with live email)` : `sent from ${m.fromAddr ?? mailbox}`}
        </p>
      ) : note ? (
        <p className="text-caption font-normal text-text-subtle">Only visible to your team</p>
      ) : null}
    </article>
  );
}

/** Messages and activity in time order. Notes are yellow; replies are indented. */
export function TicketThread({ ticket }: { ticket: TicketDetail }) {
  const { me } = useMe();
  const { members } = useLookups();
  const memberName = (id: string) => members.find((m) => m.userId === id)?.name;
  const items = [
    ...ticket.messages.map((m) => ({ kind: "message" as const, at: m.createdAt, m })),
    ...ticket.events.map((e) => ({ kind: "event" as const, at: e.createdAt, e })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className="flex flex-col gap-3" aria-label="Conversation">
      {items.map((item) =>
        item.kind === "message" ? (
          <li key={item.m.id}>
            <Message m={item.m} timezone={me.workspace.timezone} mailbox={ticket.mailbox} />
          </li>
        ) : (
          (() => {
            const text = describeEvent(item.e, memberName);
            return text ? (
              <li key={item.e.id} className="flex items-center gap-3 px-1 text-small text-text-subtle">
                <span aria-hidden className="h-px flex-1 bg-border" />
                <span className="text-center">
                  {text} ·{" "}
                  <time dateTime={item.e.createdAt} className="tabular">
                    {formatDateTime(item.e.createdAt, me.workspace.timezone)}
                  </time>
                </span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </li>
            ) : null;
          })()
        ),
      )}
    </ol>
  );
}
