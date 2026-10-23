"use client";

import {
  Banner,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Drawer,
  ErrorState,
  Field,
  Input,
  Modal,
  Skeleton,
  toast,
  useMediaQuery,
} from "@mailnitio/ui";
import { ArrowLeft, GitMerge, Link2, MoreHorizontal, PanelRight, Scissors } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { useShortcut } from "@/components/app/shortcuts";
import { canWork, PriorityBadge, TicketKey, TicketStatusChip } from "@/components/helpdesk/display";
import { type ComposerHandle, TicketComposer } from "@/components/helpdesk/ticket-composer";
import { TicketPanel } from "@/components/helpdesk/ticket-panel";
import { TicketThread } from "@/components/helpdesk/ticket-thread";
import type { TicketDetail } from "@/components/helpdesk/ticket-types";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/me";
import { POLL_MS, useApi } from "@/lib/use-api";

type Dialog = "merge" | "link" | "split" | null;

function apiErrorToast(e: unknown, fallback: string) {
  toast.error(e instanceof ApiError ? e.message : fallback, {
    description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
  });
}

/** Ask for another ticket number (merge into / link with). */
function TicketKeyDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (key: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const key = value.trim().toUpperCase();
    if (!key) {
      setError("Enter a ticket number, for example MN-1042.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(key);
      setValue("");
      setError(null);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(null);
      }}
      title={title}
      description={description}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Ticket number" error={error} required>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="MN-1042" className="font-mono" autoFocus />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SplitDialog({
  ticket,
  open,
  onOpenChange,
  onSplit,
}: {
  ticket: TicketDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSplit: (messageIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inbound = ticket.messages.filter((m) => m.direction === "inbound");

  async function split() {
    setBusy(true);
    try {
      await onSplit(selected);
      setSelected([]);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Split into a new ticket"
      description="The selected customer emails move to a new ticket that stays linked to this one."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void split()} loading={busy} disabled={selected.length === 0 || selected.length === inbound.length}>
            Split {selected.length > 0 ? `${selected.length} email${selected.length === 1 ? "" : "s"}` : ""}
          </Button>
        </>
      }
    >
      <fieldset className="flex max-h-80 flex-col gap-3 overflow-y-auto">
        <legend className="sr-only">Customer emails</legend>
        {inbound.map((m) => (
          <Checkbox
            key={m.id}
            label={m.subject ?? ticket.subject}
            description={m.bodyText.slice(0, 120)}
            checked={selected.includes(m.id)}
            onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
          />
        ))}
      </fieldset>
      {selected.length > 0 && selected.length === inbound.length ? (
        <p className="text-small text-warning">Leave at least one email on this ticket.</p>
      ) : null}
    </Modal>
  );
}

function TicketSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading ticket">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
        <Skeleton className="hidden h-[480px] w-full rounded-card lg:block" />
      </div>
    </div>
  );
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useMe();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const ticket = useApi<{ data: TicketDetail }>(`/v1/tickets/${id}`, { pollMs: POLL_MS });
  const composer = useRef<ComposerHandle>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const editable = canWork(me.role);
  const t = ticket.data?.data;
  const merged = Boolean(t?.mergedInto);

  const onChange = (updater: (x: TicketDetail) => TicketDetail) =>
    ticket.mutate((c) => (c ? { data: updater(c.data) } : c));

  useShortcut("r", () => editable && !merged && composer.current?.focus("reply"));
  useShortcut("n", () => editable && !merged && composer.current?.focus("note"));
  useShortcut("e", () => {
    if (!t || !editable || merged || t.assigneeId === me.user.id) return;
    const before = t;
    onChange((x) => ({ ...x, assigneeId: me.user.id, assigneeName: me.user.name }));
    apiFetch(`/v1/tickets/${t.id}`, { method: "PATCH", json: { assigneeId: me.user.id } })
      .then(() => toast.success("Assigned to you"))
      .catch((e) => {
        onChange(() => before);
        apiErrorToast(e, "Could not assign the ticket");
      });
  });

  if (ticket.loading && !t) return <TicketSkeleton />;
  if (ticket.error || !t) {
    return ticket.error?.status === 404 ? (
      <ErrorState
        title="Ticket not found"
        description="It may have been merged or you may not have access to it. Go back to the ticket list and search for it."
      />
    ) : (
      <ErrorState referenceId={ticket.error?.referenceId} onRetry={ticket.refetch} />
    );
  }

  async function merge(into: string) {
    const res = await apiFetch<{ data: { id: string; key: string } }>(`/v1/tickets/${id}/merge`, {
      method: "POST",
      json: { into },
    });
    toast.success(`Merged into ${res.data.key}`);
    router.push(`/app/tickets/${res.data.id}`);
  }

  async function link(key: string) {
    await apiFetch(`/v1/tickets/${id}/link`, { method: "POST", json: { with: key } });
    toast.success(`Linked with ${key}`);
    ticket.refetch();
  }

  async function split(messageIds: string[]) {
    try {
      const res = await apiFetch<{ data: { id: string; key: string } }>(`/v1/tickets/${id}/split`, {
        method: "POST",
        json: { messageIds },
      });
      toast.success(`Split into ${res.data.key}`, {
        action: { label: "Open", onClick: () => router.push(`/app/tickets/${res.data.id}`) },
      });
      ticket.refetch();
    } catch (e) {
      apiErrorToast(e, "Could not split the ticket");
    }
  }

  const panel = <TicketPanel ticket={t} editable={editable && !merged} onChange={onChange} onLink={() => setDialog("link")} />;
  const inboundCount = t.messages.filter((m) => m.direction === "inbound").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/app/tickets" className="inline-flex w-fit items-center gap-1.5 text-small text-text-muted hover:text-text">
          <ArrowLeft aria-hidden className="size-4" />
          Tickets
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <TicketKey value={t.key} className="text-body" />
              <TicketStatusChip status={t.status} />
              <PriorityBadge priority={t.priority} />
              {t.teamName ? <span className="text-small text-text-muted">{t.teamName}</span> : null}
            </div>
            <h1 className="text-h3 break-words text-text md:text-h2">{t.subject}</h1>
            {t.aiSummary ? (
              <p className="prose-width text-body text-text-muted">
                <span className="font-medium text-text">AI suggestion: </span>
                {t.aiSummary}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!desktop ? (
              <Button variant="secondary" onClick={() => setDetailsOpen(true)}>
                <PanelRight aria-hidden />
                Details
              </Button>
            ) : null}
            {editable && !merged ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" aria-label="More ticket actions">
                    <MoreHorizontal aria-hidden />
                    <span className="max-sm:sr-only">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDialog("merge")}>
                    <GitMerge aria-hidden />
                    Merge into another ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDialog("link")}>
                    <Link2 aria-hidden />
                    Link a related ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={inboundCount < 2} onSelect={() => setDialog("split")}>
                    <Scissors aria-hidden />
                    Split into a new ticket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      {t.mergedInto ? (
        <Banner
          tone="info"
          title={`This ticket was merged into ${t.mergedInto.key}`}
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={`/app/tickets/${t.mergedInto.id}`}>Open {t.mergedInto.key}</Link>
            </Button>
          }
        >
          New customer replies continue on the surviving ticket.
        </Banner>
      ) : null}
      {t.escalated && !merged ? (
        <Banner tone="danger" title="Escalated">
          This conversation mentions a complaint, regulator or legal term. Handle it before other work.
        </Banner>
      ) : null}
      {t.needsReview && t.review && !merged ? (
        <Banner
          tone="warning"
          title="The AI decision for this ticket needs review"
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={`/app/review?item=${t.review.id}`}>Review it</Link>
            </Button>
          }
        >
          Check the category and team before replying.
        </Banner>
      ) : null}
      {t.mailboxMode === "shadow" ? (
        <Banner tone="warning" title="Shadow mode">
          {t.mailbox ?? "This mailbox"} is in shadow mode: Mailnitio records decisions but does not send acknowledgements.
        </Banner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <TicketThread ticket={t} />
          {editable && !merged ? (
            <TicketComposer ref={composer} ticket={t} onSent={ticket.refetch} />
          ) : !editable ? (
            <p className="rounded-card border border-border bg-surface-2 p-4 text-small text-text-muted">
              Your role can read tickets but not reply. Ask a workspace admin if you need agent access.
            </p>
          ) : null}
        </div>
        {desktop ? <aside aria-label="Ticket details">{panel}</aside> : null}
      </div>

      {!desktop ? (
        <Drawer open={detailsOpen} onOpenChange={setDetailsOpen} title={`${t.key} details`}>
          {panel}
        </Drawer>
      ) : null}

      <TicketKeyDialog
        open={dialog === "merge"}
        onOpenChange={(o) => setDialog(o ? "merge" : null)}
        title={`Merge ${t.key} into another ticket`}
        description="Messages move to the ticket you choose and this ticket closes. This cannot be undone."
        submitLabel="Merge tickets"
        onSubmit={merge}
      />
      <TicketKeyDialog
        open={dialog === "link"}
        onOpenChange={(o) => setDialog(o ? "link" : null)}
        title="Link a related ticket"
        description="Linked tickets show on each other so agents see the full picture."
        submitLabel="Link ticket"
        onSubmit={link}
      />
      <SplitDialog ticket={t} open={dialog === "split"} onOpenChange={(o) => setDialog(o ? "split" : null)} onSplit={split} />
    </div>
  );
}
