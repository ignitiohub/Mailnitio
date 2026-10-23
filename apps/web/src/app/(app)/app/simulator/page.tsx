"use client";

import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  PermissionState,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@mailnitio/ui";
import { CheckCircle2, FlaskConical, Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ACTION_LABELS, canAdmin, EmailChip } from "@/components/helpdesk/display";
import { ApiError, apiFetch, fieldErrors } from "@/lib/api";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface Sample {
  id: string;
  label: string;
  group: string;
  from: string;
  fromName: string;
  mailbox: string;
  subject: string;
  body: string;
  needsTicket: boolean;
}

interface Mailbox {
  id: string;
  address: string;
  mode: string;
}

interface Sent {
  internetMessageId: string;
  subject: string;
  at: number;
}

interface FoundEmail {
  id: string;
  chip: string;
  action: string | null;
  ticketId: string | null;
  ticketKey: string | null;
  teamName: string | null;
}

/** Follows one injected email until the worker has processed it. */
function SentStatus({ sent }: { sent: Sent }) {
  const found = useApi<{ data: FoundEmail[] }>(
    `/v1/emails?limit=1&messageId=${encodeURIComponent(sent.internetMessageId)}`,
  );
  const email = found.data?.data[0];
  const done = email && email.chip !== "Processing";
  const waitedLong = Date.now() - sent.at > 30_000;

  const { refetch, refreshing } = found;
  useEffect(() => {
    if (done || refreshing) return;
    const timer = window.setTimeout(refetch, 1000);
    return () => window.clearTimeout(timer);
  }, [done, refreshing, refetch]);

  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-0 flex-1 truncate text-body text-text">{sent.subject}</span>
      {done && email ? (
        <span className="flex flex-wrap items-center gap-3 text-small">
          <EmailChip chip={email.chip} />
          <span className="text-text-muted">
            {email.action ? (ACTION_LABELS[email.action] ?? email.action) : "No ticket action"}
            {email.teamName ? ` · ${email.teamName}` : ""}
          </span>
          {email.ticketId ? (
            <Link href={`/app/tickets/${email.ticketId}`} className="font-mono text-primary hover:underline">
              {email.ticketKey}
            </Link>
          ) : null}
          <Link href={`/app/inbox-log/${email.id}`} className="text-primary hover:underline">
            Decision trail
          </Link>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-small text-text-muted" aria-live="polite">
          <Spinner className="size-4" />
          {waitedLong ? "Still waiting. Check that the worker is running." : "Processing…"}
        </span>
      )}
    </li>
  );
}

export default function SimulatorPage() {
  const { me } = useMe();
  const admin = canAdmin(me.role);
  const samples = useApi<{ data: Sample[] }>(admin ? "/v1/simulator/samples" : null);
  const mailboxes = useApi<{ data: Mailbox[] }>(admin ? "/v1/mailboxes" : null);
  const [mode, setMode] = useState<"sample" | "custom">("sample");
  const [sampleId, setSampleId] = useState("");
  const [mailboxId, setMailboxId] = useState("");
  const [ticketKey, setTicketKey] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent[]>([]);

  const groups = useMemo(() => {
    const map = new Map<string, Sample[]>();
    for (const s of samples.data?.data ?? []) map.set(s.group, [...(map.get(s.group) ?? []), s]);
    return [...map.entries()];
  }, [samples.data]);
  const sample = samples.data?.data.find((s) => s.id === sampleId);
  const boxes = mailboxes.data?.data ?? [];

  useEffect(() => {
    if (!sampleId && samples.data?.data[0]) setSampleId(samples.data.data[0].id);
  }, [samples.data, sampleId]);
  useEffect(() => {
    if (!mailboxId && boxes[0]) setMailboxId(boxes[0].id);
  }, [boxes, mailboxId]);

  if (!admin) return <PermissionState requiredRole="admin" />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    if (mode === "sample" && sample?.needsTicket && !ticketKey.trim()) {
      setErrors({
        replyToTicketKey: "This sample is a follow-up. Enter the ticket it replies to, for example MN-1042.",
      });
      return;
    }
    const json =
      mode === "sample"
        ? { sampleId, mailboxId: mailboxId || undefined, replyToTicketKey: ticketKey.trim() || undefined }
        : { mailboxId, fromName, fromEmail, subject, body, replyToTicketKey: ticketKey.trim() || undefined };
    setBusy(true);
    try {
      const res = await apiFetch<{ data: { jobId: string; internetMessageId: string } }>(
        "/v1/simulator/emails",
        {
          method: "POST",
          json,
        },
      );
      setSent((s) =>
        [
          {
            internetMessageId: res.data.internetMessageId,
            subject: mode === "sample" ? (sample?.subject ?? "Sample email") : subject,
            at: Date.now(),
          },
          ...s,
        ].slice(0, 10),
      );
      toast.success("Email sent to the pipeline");
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(
        Object.keys(fields).length
          ? fields
          : { form: e instanceof ApiError ? e.message : "Could not send the email." },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Email simulator"
        description="Send a test email through the same pipeline a connected mailbox uses. It appears in the inbox log and tickets within seconds."
      />
      <Banner tone="info" title="For demos and testing">
        Simulated emails are processed like real ones but nothing is sent to anyone. Replies and
        acknowledgements are recorded only.
      </Banner>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5 p-4 md:p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "sample" | "custom")}>
            <TabsList aria-label="Email source">
              <TabsTrigger value="sample">Use a sample</TabsTrigger>
              <TabsTrigger value="custom">Write your own</TabsTrigger>
            </TabsList>
          </Tabs>
          {samples.error ? (
            <ErrorState
              title="Samples are not available"
              description={samples.error.message}
              referenceId={samples.error.referenceId}
              onRetry={samples.refetch}
            />
          ) : samples.loading || mailboxes.loading ? (
            <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Loading samples">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : boxes.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No mailboxes"
              description="Load an industry pack first; the simulator sends to one of its mailboxes."
            />
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="Mailbox" error={errors.mailboxId}>
                <Select value={mailboxId} onChange={(e) => setMailboxId(e.target.value)}>
                  {boxes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.address}
                      {m.mode !== "live" ? ` (${m.mode})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {mode === "sample" ? (
                <Field label="Sample email" error={errors.sampleId}>
                  <Select value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
                    {groups.map(([group, items]) => (
                      <optgroup key={group} label={group}>
                        {items.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}: {s.subject}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Sender name" required error={errors.fromName}>
                      <Input
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="Amaka Obi"
                      />
                    </Field>
                    <Field label="Sender email" required error={errors.fromEmail}>
                      <Input
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="amaka.obi@example.com"
                      />
                    </Field>
                  </div>
                  <Field label="Subject" required error={errors.subject}>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </Field>
                  <Field
                    label="Email"
                    required
                    error={errors.body}
                    helper="Classified by keyword rules, since the demo does not call a live model."
                  >
                    <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
                  </Field>
                </>
              )}
              <Field
                label="Reply to ticket"
                optional={!(mode === "sample" && sample?.needsTicket)}
                required={mode === "sample" && sample?.needsTicket}
                error={errors.replyToTicketKey}
                helper="Makes the email a reply on an existing ticket, as if the customer answered our email."
              >
                <Input
                  value={ticketKey}
                  onChange={(e) => setTicketKey(e.target.value)}
                  placeholder="MN-1042"
                  className="font-mono"
                />
              </Field>
              {errors.form ? (
                <p role="alert" className="text-small text-danger">
                  {errors.form}
                </p>
              ) : null}
              <Button type="submit" loading={busy} className="self-start">
                <Send aria-hidden />
                Send to pipeline
              </Button>
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          {mode === "sample" && sample ? (
            <Card className="flex flex-col gap-2 p-4 md:p-6">
              <p className="text-overline text-text-subtle uppercase">Preview</p>
              <p className="text-small text-text-muted">
                From {sample.fromName} &lt;{sample.from}&gt;
              </p>
              <h2 className="text-h4 text-text">{sample.subject}</h2>
              <p className="prose-width max-h-72 overflow-y-auto text-body whitespace-pre-wrap text-text">
                {sample.body}
              </p>
            </Card>
          ) : null}
          <Card className="overflow-hidden">
            <h2 className="border-b border-border px-4 py-3 text-h4 text-text">Sent in this session</h2>
            {sent.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing sent yet"
                description="Each email you send shows its result here as soon as it is processed."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {sent.map((s) => (
                  <SentStatus key={s.internetMessageId} sent={s} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
