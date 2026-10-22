"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@mailnitio/ui";
import { ArrowRight, BarChart3, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";

interface MembersPage {
  data: { id: string }[];
  nextCursor: string | null;
}

export default function DashboardPage() {
  const { me } = useMe();
  const members = useApi<MembersPage>("/v1/workspace/members?limit=2");
  const helpdesk = me.workspace.productInterest !== "send";
  const send = me.workspace.productInterest !== "helpdesk";
  const firstName = me.user.name.split(" ")[0] ?? me.user.name;

  const tasks = [
    { label: "Create your workspace", done: true, href: null },
    {
      label: "Turn on two-factor authentication",
      done: me.user.twoFactorEnabled,
      href: "/app/settings/security",
    },
    {
      label: "Invite a colleague",
      done: (members.data?.data.length ?? 0) > 1,
      loading: members.loading,
      href: "/app/settings/members",
    },
    ...(helpdesk ? [{ label: "Connect a support mailbox", done: false, href: "/app/mailboxes" }] : []),
    ...(send ? [{ label: "Verify a sending domain", done: false, href: "/app/domains" }] : []),
  ];
  const completed = tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`${me.workspace.name} · ${me.workspace.timezone.replace("_", " ")}`}
        actions={
          helpdesk ? (
            <Button asChild>
              <Link href="/app/mailboxes">Connect a mailbox</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/app/domains">Add a sending domain</Link>
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <Badge tone={completed === tasks.length ? "success" : "neutral"} className="tabular">
              {completed} of {tasks.length} done
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {tasks.map((task) => (
                <li key={task.label} className="flex min-h-12 items-center gap-3 py-2">
                  {"loading" in task && task.loading ? (
                    <Skeleton className="size-5 rounded-full" />
                  ) : task.done ? (
                    <CheckCircle2 aria-hidden className="size-5 shrink-0 stroke-[1.75] text-success" />
                  ) : (
                    <Circle aria-hidden className="size-5 shrink-0 stroke-[1.75] text-text-subtle" />
                  )}
                  <span
                    className={
                      task.done
                        ? "flex-1 text-body text-text-muted line-through"
                        : "flex-1 text-body text-text"
                    }
                  >
                    {task.label}
                    <span className="sr-only">{task.done ? " (done)" : " (to do)"}</span>
                  </span>
                  {!task.done && task.href ? (
                    <Link
                      href={task.href}
                      className="inline-flex min-h-11 items-center gap-1 text-small font-medium text-primary hover:underline"
                    >
                      Start
                      <ArrowRight aria-hidden className="size-4 stroke-[1.75]" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <EmptyState
            icon={BarChart3}
            title="No activity yet"
            description={
              helpdesk
                ? "Emails processed, routing accuracy and SLA performance will appear here once a mailbox is connected."
                : "Sends, deliveries and complaints will appear here after your first campaign."
            }
          />
        </Card>
      </div>
    </div>
  );
}
