"use client";

import { Button, Checkbox, Field, Input, Select, Textarea, toast } from "@mailnitio/ui";
import { Check } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useLookups } from "./lookups";

export interface ReviewTarget {
  reviewId: string;
  category: string | null;
  /** Team key the email was routed to. */
  routedTeam: string | null;
  ticketKey: string | null;
  customer: { id: string; name: string | null; email: string } | null;
}

interface CustomerHit {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
}

function CustomerPicker({ value, onChange }: { value: CustomerHit | null; onChange: (c: CustomerHit | null) => void }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const hits = useApi<{ data: CustomerHit[] }>(q.length >= 2 ? `/v1/customers?limit=5&q=${encodeURIComponent(q)}` : null);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-control border border-border-strong px-3 py-2">
        <span className="min-w-0 truncate text-body text-text">
          {value.name ?? value.email} <span className="text-small text-text-muted">{value.email}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search customers" />
      {q.length >= 2 ? (
        <ul className="flex flex-col rounded-control border border-border" aria-label="Matching customers">
          {hits.loading ? <li className="px-3 py-2 text-small text-text-subtle">Searching…</li> : null}
          {!hits.loading && (hits.data?.data.length ?? 0) === 0 ? (
            <li className="px-3 py-2 text-small text-text-subtle">No customers match “{q}”</li>
          ) : null}
          {hits.data?.data.map((c) => (
            <li key={c.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => onChange(c)}
                className="flex min-h-11 w-full cursor-pointer flex-col px-3 py-2 text-left hover:bg-surface-2"
              >
                <span className="text-body text-text">{c.name ?? c.email}</span>
                <span className="text-small text-text-muted">
                  {c.email}
                  {c.company ? ` · ${c.company}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Approve the AI decision, or correct it: category, team, link to an existing ticket, split into a new
 * ticket, set the customer. Every correction is stored as an override and written to the audit log.
 */
export function ReviewActions({ target, onDone }: { target: ReviewTarget; onDone: () => void }) {
  const { config, teams, teamByKey } = useLookups();
  const routed = teamByKey(target.routedTeam);
  const [category, setCategory] = useState(target.category ?? "");
  const [teamId, setTeamId] = useState(routed?.id ?? "");
  const [linkKey, setLinkKey] = useState("");
  const [split, setSplit] = useState(false);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "override" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when moving to another review item.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the review id
  useEffect(() => {
    setCategory(target.category ?? "");
    setTeamId(teamByKey(target.routedTeam)?.id ?? "");
    setLinkKey("");
    setSplit(false);
    setCustomer(null);
    setNote("");
    setError(null);
  }, [target.reviewId]);

  // A category change routes to that category's team unless the reviewer picks one.
  function changeCategory(next: string) {
    setCategory(next);
    const team = teamByKey(config?.categories.find((c) => c.key === next)?.team);
    if (team) setTeamId(team.id);
  }

  const body: Record<string, unknown> = {};
  if (category && category !== target.category) body.category = category;
  if (teamId && teamId !== routed?.id) body.teamId = teamId;
  if (linkKey.trim()) body.linkTicketKey = linkKey.trim().toUpperCase();
  if (split) body.split = true;
  if (customer && customer.id !== target.customer?.id) body.customerId = customer.id;
  const changed = Object.keys(body).length > 0;

  async function approve() {
    setBusy("approve");
    try {
      await apiFetch(`/v1/reviews/${target.reviewId}/approve`, { method: "POST" });
      toast.success("Decision approved");
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not approve", {
        description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function override(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setBusy("override");
    setError(null);
    try {
      await apiFetch(`/v1/reviews/${target.reviewId}/override`, {
        method: "POST",
        json: { ...body, note: note.trim() || undefined },
      });
      toast.success("Decision corrected", { description: "The ticket is updated and the change is in the audit log." });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the correction. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 p-4">
        <p className="text-body text-text">If the AI got it right, approve it. The ticket stays where it is.</p>
        <Button onClick={() => void approve()} loading={busy === "approve"} disabled={busy !== null} className="self-start">
          <Check aria-hidden />
          Approve decision
        </Button>
      </div>

      <form onSubmit={override} className="flex flex-col gap-4" aria-label="Correct the decision">
        <h3 className="text-h4 text-text">Correct the decision</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onChange={(e) => changeCategory(e.target.value)}>
              {!target.category ? <option value="">Not classified</option> : null}
              {(config?.categories ?? []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Team">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {!routed ? <option value="">No team</option> : null}
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Link to an existing ticket"
          optional
          helper={target.ticketKey ? `Moves this email off ${target.ticketKey} and onto the ticket you enter.` : "Adds this email to the ticket you enter."}
        >
          <Input value={linkKey} onChange={(e) => setLinkKey(e.target.value)} placeholder="MN-1042" className="font-mono" disabled={split} />
        </Field>
        <Checkbox
          label="Split into a new ticket"
          description="Use when this email raises a separate issue from the rest of the conversation."
          checked={split}
          disabled={Boolean(linkKey.trim()) || !target.ticketKey}
          onChange={(e) => setSplit(e.target.checked)}
        />
        <Field label="Customer" optional helper={target.customer ? `Currently ${target.customer.name ?? target.customer.email}` : "No customer matched this sender."}>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </Field>
        <Field label="Note for the audit log" optional>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Why the decision changed" />
        </Field>
        {error ? (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="secondary" loading={busy === "override"} disabled={!changed || busy !== null} className="self-start">
          Save correction
        </Button>
      </form>
    </div>
  );
}
