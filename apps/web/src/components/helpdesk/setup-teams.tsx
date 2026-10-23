"use client";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  formatNumber,
  Input,
  Modal,
  Select,
  toast,
} from "@mailnitio/ui";
import { Plus, Users } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch, fieldErrors } from "@/lib/api";
import { type TeamOption, useLookups } from "./lookups";

function errorToast(e: unknown, fallback: string) {
  toast.error(e instanceof ApiError ? e.message : fallback, {
    description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
  });
}

/** Create or edit a team's name, alias and auto-assignment. */
function TeamForm({
  team,
  open,
  onOpenChange,
  onSaved,
}: {
  team: TeamOption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [autoAssign, setAutoAssign] = useState("none");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(team?.name ?? "");
    setAlias(team?.emailAlias ?? "");
    setAutoAssign(team?.autoAssign ?? "none");
    setErrors({});
  }, [open, team]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const json = { name, emailAlias: alias.trim() || null, autoAssign };
      await apiFetch(team ? `/v1/teams/${team.id}` : "/v1/teams", { method: team ? "PATCH" : "POST", json });
      toast.success(team ? "Team updated" : `${name} created`);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(
        Object.keys(fields).length
          ? fields
          : { form: e instanceof ApiError ? e.message : "Could not save the team." },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={team ? `Edit ${team.name}` : "Create a team"}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Team name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field
          label="Team email alias"
          optional
          error={errors.emailAlias}
          helper="Shown to agents; replies still go from the mailbox."
        >
          <Input
            type="email"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="cards@acmeasset.example"
          />
        </Field>
        <Field label="Assign new tickets">
          <Select value={autoAssign} onChange={(e) => setAutoAssign(e.target.value)}>
            <option value="none">Leave unassigned (agents pick from the queue)</option>
            <option value="round_robin">Round robin across team members</option>
          </Select>
        </Field>
        {errors.form ? (
          <p role="alert" className="text-small text-danger">
            {errors.form}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {team ? "Save team" : "Create team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MembersDrawer({
  team,
  onOpenChange,
  onSaved,
}: {
  team: TeamOption | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { members } = useLookups();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSelected(team?.members.map((m) => m.userId) ?? []), [team]);

  async function save() {
    if (!team) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/teams/${team.id}/members`, { method: "PUT", json: { userIds: selected } });
      toast.success(`${team.name} members updated`);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      errorToast(e, "Could not update members");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={team !== null}
      onOpenChange={onOpenChange}
      title={team ? `${team.name} members` : "Members"}
      description="Members see this team's queue and can be assigned its tickets."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Save members
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Workspace members</legend>
        {members.map((m) => (
          <Checkbox
            key={m.userId}
            label={m.name}
            description={`${m.email} · ${m.role}`}
            checked={selected.includes(m.userId)}
            onChange={(e) =>
              setSelected((s) => (e.target.checked ? [...s, m.userId] : s.filter((x) => x !== m.userId)))
            }
          />
        ))}
      </fieldset>
    </Drawer>
  );
}

export function TeamsTab({ editable }: { editable: boolean }) {
  const { teams, refresh } = useLookups();
  const [form, setForm] = useState<{ open: boolean; team: TeamOption | null }>({ open: false, team: null });
  const [membersOf, setMembersOf] = useState<TeamOption | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div className="flex justify-end">
          <Button onClick={() => setForm({ open: true, team: null })}>
            <Plus aria-hidden />
            Create team
          </Button>
        </div>
      ) : null}
      {teams.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Create a team so categories have somewhere to route."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-h4 text-text">{t.name}</h3>
                  <p className="truncate text-small text-text-muted">{t.emailAlias ?? "No email alias"}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {t.isEscalationTeam ? <Badge tone="danger">Escalations</Badge> : null}
                  <Badge tone="outline">{t.autoAssign === "round_robin" ? "Round robin" : "Queue"}</Badge>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-small">
                <div>
                  <dt className="text-text-subtle">Open tickets</dt>
                  <dd className="text-h4 text-text tabular">{formatNumber(t.openTickets)}</dd>
                </div>
                <div>
                  <dt className="text-text-subtle">Members</dt>
                  <dd className="text-h4 text-text tabular">{formatNumber(t.members.length)}</dd>
                </div>
              </dl>
              <p className="text-small text-text-muted">
                {t.categories.length
                  ? `Handles ${t.categories.map((c) => c.label).join(", ")}`
                  : "No categories route here yet."}
              </p>
              {t.members.length ? (
                <p className="text-small text-text">{t.members.map((m) => m.name).join(", ")}</p>
              ) : null}
              {editable ? (
                <div className="mt-auto flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="secondary" onClick={() => setMembersOf(t)}>
                    Manage members
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, team: t })}>
                    Edit
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      <TeamForm
        team={form.team}
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        onSaved={refresh}
      />
      <MembersDrawer team={membersOf} onOpenChange={(o) => !o && setMembersOf(null)} onSaved={refresh} />
    </div>
  );
}
