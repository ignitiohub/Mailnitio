"use client";

import {
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  toast,
} from "@mailnitio/ui";
import { MessageSquareText, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PRIORITY_LABELS, PriorityBadge } from "./display";
import { type CategoryOption, useLookups } from "./lookups";

/** Every config change saves a new version; the pipeline picks it up on the next email. */
async function saveConfig(patch: Record<string, unknown>, notes: string) {
  const res = await apiFetch<{ data: { version: number } }>("/v1/config", {
    method: "PATCH",
    json: { ...patch, notes },
  });
  toast.success(`Saved as configuration version ${res.data.version}`);
}

function failed(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

const splitList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const toKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "c_$1")
    .slice(0, 40);

function CategoryDrawer({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryOption | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { config, teams, refresh } = useLookups();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("");
  const [priority, setPriority] = useState("medium");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(category?.label ?? "");
    setDescription(category?.description ?? "");
    setTeam(category?.team ?? teams[0]?.key ?? "");
    setPriority(category?.defaultPriority ?? "medium");
    setInclude(category?.include.join(", ") ?? "");
    setExclude(category?.exclude.join(", ") ?? "");
    setError(null);
  }, [open, category, teams]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    const key = category?.key ?? toKey(label);
    if (!category && config.categories.some((c) => c.key === key)) {
      setError("A category with this name already exists.");
      return;
    }
    const next = {
      key,
      label: label.trim(),
      description: description.trim(),
      team,
      defaultPriority: priority,
      include: splitList(include),
      exclude: splitList(exclude),
    };
    const categories = category
      ? config.categories.map((c) => (c.key === key ? next : c))
      : [...config.categories, next];
    setBusy(true);
    try {
      await saveConfig(
        { categories },
        category ? `Edited category ${next.label}` : `Added category ${next.label}`,
      );
      onOpenChange(false);
      refresh();
    } catch (e) {
      setError(failed(e, "Could not save the category."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={category ? `Edit ${category.label}` : "Add a category"}
      description="The AI uses the description and phrases to decide when an email belongs here."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name" required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            minLength={2}
            maxLength={60}
            required
          />
        </Field>
        <Field label="Description" required helper="One or two sentences on what customers ask about.">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={5}
            maxLength={400}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Routes to team">
            <Select value={team} onChange={(e) => setTeam(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.key}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Phrases that point here"
          optional
          helper="Separate with commas, e.g. card blocked, ATM, chargeback."
        >
          <Textarea rows={3} value={include} onChange={(e) => setInclude(e.target.value)} />
        </Field>
        <Field
          label="Phrases that point elsewhere"
          optional
          helper="Signals that look similar but belong to another category."
        >
          <Textarea rows={2} value={exclude} onChange={(e) => setExclude(e.target.value)} />
        </Field>
        {error ? (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!team}>
            {category ? "Save category" : "Add category"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

export function CategoriesTab({ editable }: { editable: boolean }) {
  const { config, teamByKey } = useLookups();
  const [drawer, setDrawer] = useState<{ open: boolean; category: CategoryOption | null }>({
    open: false,
    category: null,
  });
  const categories = config?.categories ?? [];

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div className="flex justify-end">
          <Button onClick={() => setDrawer({ open: true, category: null })}>
            <Plus aria-hidden />
            Add category
          </Button>
        </div>
      ) : null}
      <Card className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-border" aria-label="Categories">
          {categories.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-medium text-text">{c.label}</span>
                  {c.key === config?.defaultCategory ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption text-primary">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="text-small text-text-muted">{c.description}</p>
                {c.include.length ? (
                  <p className="text-caption font-normal text-text-subtle">
                    {c.include.slice(0, 8).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-small text-text">{teamByKey(c.team)?.name ?? c.team}</span>
                <PriorityBadge priority={c.defaultPriority} />
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${c.label}`}
                    onClick={() => setDrawer({ open: true, category: c })}
                  >
                    <Pencil aria-hidden />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <CategoryDrawer
        category={drawer.category}
        open={drawer.open}
        onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}
      />
    </div>
  );
}

export function RulesTab({ editable }: { editable: boolean }) {
  const { config, configVersion, teams, refresh } = useLookups();
  const [high, setHigh] = useState(85);
  const [low, setLow] = useState(60);
  const [defaultCategory, setDefaultCategory] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [term, setTerm] = useState("");
  const [escalationTeam, setEscalationTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setHigh(Math.round(config.thresholds.high * 100));
    setLow(Math.round(config.thresholds.low * 100));
    setDefaultCategory(config.defaultCategory);
    setTerms(config.escalation.terms);
    setEscalationTeam(config.escalation.team);
  }, [config]);

  if (!config) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    if (low > high) {
      setError("The review threshold cannot be above the auto-route threshold.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveConfig(
        {
          thresholds: { ...config.thresholds, high: high / 100, low: low / 100 },
          defaultCategory,
          escalation: { terms, team: escalationTeam },
        },
        "Updated thresholds and escalation",
      );
      refresh();
    } catch (e) {
      setError(failed(e, "Could not save the rules."));
    } finally {
      setBusy(false);
    }
  }

  function addTerm(event: FormEvent) {
    event.preventDefault();
    const value = term.trim().toLowerCase();
    if (value.length >= 2 && !terms.includes(value)) setTerms((t) => [...t, value]);
    setTerm("");
  }

  return (
    <div className="flex flex-col gap-4">
      <form id="rules-form" onSubmit={save} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-h4 text-text">Confidence thresholds</h3>
            <p className="text-small text-text-muted">
              At or above the auto-route threshold the email goes straight to its team. Between the two it is
              routed and flagged for review. Below the review threshold it goes to the mailbox default and
              needs review.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Auto-route at or above (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={high}
                disabled={!editable}
                onChange={(e) => setHigh(Number(e.target.value))}
                className="tabular"
              />
            </Field>
            <Field label="Needs review below (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={low}
                disabled={!editable}
                onChange={(e) => setLow(Number(e.target.value))}
                className="tabular"
              />
            </Field>
          </div>
          <Field label="Default category" helper="Used when the AI fails or is not confident.">
            <Select
              value={defaultCategory}
              disabled={!editable}
              onChange={(e) => setDefaultCategory(e.target.value)}
            >
              {config.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
        <Card className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-h4 text-text">Escalation</h3>
            <p className="text-small text-text-muted">
              Any email containing one of these terms is escalated and routed to the escalation team, whatever
              its category.
            </p>
          </div>
          <Field label="Escalation team">
            <Select
              value={escalationTeam}
              disabled={!editable}
              onChange={(e) => setEscalationTeam(e.target.value)}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.key}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <ul className="flex flex-wrap gap-1.5" aria-label="Escalation terms">
            {terms.map((t) => (
              <li
                key={t}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-danger-soft pr-1 pl-3 text-small text-text"
              >
                {t}
                {editable ? (
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => setTerms((x) => x.filter((y) => y !== t))}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-surface"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </form>
      {editable ? (
        <form onSubmit={addTerm} className="flex gap-2">
          <label htmlFor="new-term" className="sr-only">
            Add an escalation term
          </label>
          <Input
            id="new-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Add a term, e.g. ombudsman"
            className="max-w-80"
          />
          <Button type="submit" variant="secondary">
            Add term
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-text-subtle tabular">
          Active configuration version {configVersion ?? "None"}
        </p>
        {editable ? (
          <Button type="submit" form="rules-form" loading={busy}>
            Save rules
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface Canned {
  id: string;
  title: string;
  body: string;
  teamId: string | null;
}

export function CannedTab({ editable }: { editable: boolean }) {
  const { teams } = useLookups();
  const list = useApi<{ data: Canned[] }>("/v1/canned-responses");
  const [editing, setEditing] = useState<Canned | "new" | null>(null);
  const [deleting, setDeleting] = useState<Canned | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const c = editing === "new" ? null : editing;
    setTitle(c?.title ?? "");
    setBody(c?.body ?? "");
    setTeamId(c?.teamId ?? "");
    setError(null);
  }, [editing]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const json = { title, body, teamId: teamId || null };
      if (editing === "new") await apiFetch("/v1/canned-responses", { method: "POST", json });
      else await apiFetch(`/v1/canned-responses/${editing.id}`, { method: "PATCH", json });
      toast.success("Canned response saved");
      setEditing(null);
      list.refetch();
    } catch (e) {
      setError(failed(e, "Could not save the response."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await apiFetch(`/v1/canned-responses/${deleting.id}`, { method: "DELETE" });
      toast.success(`“${deleting.title}” deleted`);
      list.refetch();
    } catch (e) {
      toast.error(failed(e, "Could not delete the response."));
    } finally {
      setDeleting(null);
    }
  }

  const rows = list.data?.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Add response
          </Button>
        </div>
      ) : null}
      <Card className="overflow-hidden">
        {rows.length === 0 && !list.loading ? (
          <EmptyState
            icon={MessageSquareText}
            title="No canned responses"
            description="Save replies your agents send often, then insert them from the composer."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body font-medium text-text">{c.title}</span>
                  <p className="line-clamp-2 text-small text-text-muted">{c.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-small text-text-muted">
                    {teams.find((t) => t.id === c.teamId)?.name ?? "All teams"}
                  </span>
                  {editable ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${c.title}`}
                        onClick={() => setEditing(c)}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${c.title}`}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Drawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Add a canned response" : "Edit canned response"}
        description="Placeholders: {{customer_first_name}}, {{agent_name}}, {{ticket_number}}."
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
          </Field>
          <Field label="Response" required>
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              required
            />
          </Field>
          <Field label="Available to">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          {error ? (
            <p role="alert" className="text-small text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Save response
            </Button>
          </div>
        </form>
      </Drawer>
      <Modal
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title ?? ""}”?`}
        description="Agents will no longer be able to insert it. Replies already sent are not affected."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Delete response
            </Button>
          </>
        }
      />
    </div>
  );
}
