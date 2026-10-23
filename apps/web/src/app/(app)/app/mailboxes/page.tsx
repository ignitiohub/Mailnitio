"use client";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  formatNumber,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  toast,
} from "@mailnitio/ui";
import { Mail, PlugZap, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { canAdmin, When } from "@/components/helpdesk/display";
import { useLookups } from "@/components/helpdesk/lookups";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface MailboxRow {
  id: string;
  address: string;
  displayName: string;
  defaultCategory: string;
  mode: "live" | "shadow" | "paused";
  ackEnabled: boolean;
  health: string;
  lastCheckedAt: string | null;
  lastReceivedAt: string | null;
  processedToday: number;
  processed7d: number;
  failed7d: number;
}

const MODES = {
  live: { label: "Live", help: "Creates tickets and sends acknowledgements." },
  shadow: { label: "Shadow", help: "Records decisions only. Nothing is sent or changed for customers." },
  paused: { label: "Paused", help: "Emails are not processed until you resume." },
} as const;

function MailboxCard({
  mailbox,
  editable,
  onChanged,
}: {
  mailbox: MailboxRow;
  editable: boolean;
  onChanged: () => void;
}) {
  const { config } = useLookups();
  const [pendingMode, setPendingMode] = useState<MailboxRow["mode"] | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function patch(body: Partial<MailboxRow>, message: string) {
    try {
      await apiFetch(`/v1/mailboxes/${mailbox.id}`, { method: "PATCH", json: body });
      toast.success(message);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update the mailbox", {
        description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
      });
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{ data: { ok: boolean; detail: string } }>(
        `/v1/mailboxes/${mailbox.id}/test`,
        { method: "POST" },
      );
      setTestResult(res.data.detail);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "The check failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h4 break-all text-text">{mailbox.address}</h2>
          <p className="text-small text-text-muted">{mailbox.displayName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={mailbox.mode === "live" ? "success" : mailbox.mode === "shadow" ? "neutral" : "warning"}
          >
            {MODES[mailbox.mode].label}
          </Badge>
          <Badge tone={mailbox.health === "ok" ? "success" : "danger"}>
            {mailbox.health === "ok" ? "Healthy" : "Needs attention"}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Today", formatNumber(mailbox.processedToday)],
          ["Last 7 days", formatNumber(mailbox.processed7d)],
          ["Failed, 7 days", formatNumber(mailbox.failed7d)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-caption text-text-subtle">{label}</dt>
            <dd className="text-h4 text-text tabular">{value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-text-subtle">Last email</dt>
          <dd className="text-body text-text">
            {mailbox.lastReceivedAt ? <When at={mailbox.lastReceivedAt} /> : "None yet"}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
        <Field label="Mode" helper={MODES[mailbox.mode].help}>
          <Select
            value={mailbox.mode}
            disabled={!editable}
            onChange={(e) => {
              const next = e.target.value as MailboxRow["mode"];
              if (next === "live") setPendingMode(next);
              else void patch({ mode: next }, `${mailbox.address} set to ${MODES[next].label.toLowerCase()}`);
            }}
          >
            {Object.entries(MODES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Default category" helper="Used when the AI cannot classify an email.">
          <Select
            value={mailbox.defaultCategory}
            disabled={!editable}
            onChange={(e) => void patch({ defaultCategory: e.target.value }, "Default category updated")}
          >
            {(config?.categories ?? []).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Checkbox
          label="Send acknowledgements"
          description="Reply to new emails with the ticket number from this mailbox."
          checked={mailbox.ackEnabled}
          disabled={!editable}
          onChange={(e) =>
            void patch(
              { ackEnabled: e.target.checked },
              e.target.checked ? "Acknowledgements on" : "Acknowledgements off",
            )
          }
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-text-muted">
          {mailbox.lastCheckedAt ? (
            <>
              Last checked <When at={mailbox.lastCheckedAt} />
            </>
          ) : (
            "Not checked yet"
          )}
        </p>
        {editable ? (
          <Button variant="secondary" onClick={() => void test()} loading={testing}>
            <RefreshCw aria-hidden />
            Test connection
          </Button>
        ) : null}
      </div>
      {testResult ? (
        <p
          role="status"
          className="rounded-card border border-success/30 bg-success-soft p-3 text-small text-text"
        >
          {testResult}
        </p>
      ) : null}

      <Modal
        open={pendingMode !== null}
        onOpenChange={(o) => !o && setPendingMode(null)}
        title={`Make ${mailbox.address} live?`}
        description="Mailnitio will create tickets and, if acknowledgements are on, reply to customers from this mailbox."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingMode(null)}>
              Keep current mode
            </Button>
            <Button
              onClick={() => {
                setPendingMode(null);
                void patch({ mode: "live" }, `${mailbox.address} is live`);
              }}
            >
              Go live
            </Button>
          </>
        }
      />
    </Card>
  );
}

export default function MailboxesPage() {
  const { me } = useMe();
  const mailboxes = useApi<{ data: MailboxRow[] }>("/v1/mailboxes");
  const editable = canAdmin(me.role);
  const rows = mailboxes.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mailboxes and connections"
        description="The shared inboxes Mailnitio reads, how each one behaves, and the email connection behind them."
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center md:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted">
          <PlugZap aria-hidden className="size-5 stroke-[1.75]" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <h2 className="text-h4 text-text">Microsoft 365</h2>
          <p className="text-small text-text-muted">
            Not connected. This workspace runs on demo data and the email simulator; your Mailnitio team
            connects your mailboxes during setup.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/demo?offer=setup">Request setup</Link>
        </Button>
      </Card>

      {mailboxes.loading && !mailboxes.data ? (
        <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading mailboxes">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      ) : mailboxes.error ? (
        <ErrorState referenceId={mailboxes.error.referenceId} onRetry={mailboxes.refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="No mailboxes yet"
            description="Connect a shared mailbox so Mailnitio can start reading customer emails."
            action={
              <Button asChild>
                <Link href="/demo?offer=setup">Connect a mailbox</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {!editable ? (
            <p className="text-small text-text-muted">Only owners and admins can change mailbox settings.</p>
          ) : null}
          {rows.map((m) => (
            <MailboxCard key={m.id} mailbox={m} editable={editable} onChanged={mailboxes.refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
