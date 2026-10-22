"use client";

import { industries, LEAD_COUNTRIES } from "@mailnitio/config";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  toast,
} from "@mailnitio/ui";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetch, fieldErrors } from "@/lib/api";
import { canManageWorkspace, useMe } from "@/lib/me";

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
];

export default function WorkspaceSettingsPage() {
  const { me, refresh } = useMe();
  const editable = canManageWorkspace(me.role);
  const [values, setValues] = useState({
    name: me.workspace.name,
    country: me.workspace.country ?? "Nigeria",
    industry: me.workspace.industry ?? "Other",
    timezone: me.workspace.timezone,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (values.name.trim().length < 2) {
      setErrors({ name: "Enter a workspace name" });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await apiFetch("/v1/workspace", { method: "PATCH", json: { ...values, name: values.name.trim() } });
      toast.success("Workspace details saved");
      refresh();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Could not save changes", {
        description:
          error instanceof ApiError && error.referenceId ? `Reference ${error.referenceId}` : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form noValidate onSubmit={onSubmit}>
        <CardHeader>
          <div>
            <CardTitle>Workspace details</CardTitle>
            {!editable ? (
              <p className="mt-1 text-body text-text-muted">
                Only owners and admins can change these details.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Workspace name" required error={errors.name}>
            <Input
              value={values.name}
              disabled={!editable}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Workspace ID" helper="Share this with support if you need help.">
            <Input value={me.workspace.id} readOnly className="font-mono text-small" />
          </Field>
          <Field label="Country">
            <Select
              value={values.country}
              disabled={!editable}
              onChange={(e) => setValues({ ...values, country: e.target.value })}
            >
              {LEAD_COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Industry">
            <Select
              value={values.industry}
              disabled={!editable}
              onChange={(e) => setValues({ ...values, industry: e.target.value })}
            >
              {industries.map((i) => (
                <option key={i.slug} value={i.name}>
                  {i.name}
                </option>
              ))}
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Timezone" helper="Dates, SLAs and reports use this timezone.">
            <Select
              value={values.timezone}
              disabled={!editable}
              onChange={(e) => setValues({ ...values, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
        {editable ? (
          <CardFooter>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
