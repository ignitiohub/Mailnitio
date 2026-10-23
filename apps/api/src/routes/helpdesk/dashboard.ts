import { tenantConfigSchema } from "@mailnitio/config";
import { sql } from "@mailnitio/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ctx } from "../../plugins/session";
import { access, type HelpdeskDeps, READ_ROLES, workspaceTimezone } from "./common";

/** GET /v1/dashboard: KPIs, charts and mailbox health, with "today" in the workspace timezone. */
export const dashboardRoutes =
  (deps: HelpdeskDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get("/v1/dashboard", { preHandler: access(deps.guard, READ_ROLES) }, async (request) => {
      const { workspaceId } = ctx(request);
      return deps.appDb.withTenant(workspaceId, async (tx) => {
        const tz = await workspaceTimezone(tx, workspaceId);
        const start = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`;

        const [kpi] = (
          await tx.execute<{
            processed_today: number;
            processed_yesterday: number;
            new_today: number;
            appended_today: number;
            new_yesterday: number;
            appended_yesterday: number;
            routed_7d: number;
            rerouted_7d: number;
            routed_prev_7d: number;
            rerouted_prev_7d: number;
            failed_today: number;
            failed_yesterday: number;
          }>(sql`
            select
              count(*) filter (where received_at >= ${start} and status in ('processed','shadow'))::int processed_today,
              count(*) filter (where received_at >= ${start} - interval '1 day' and received_at < ${start} and status in ('processed','shadow'))::int processed_yesterday,
              count(*) filter (where received_at >= ${start} and action in ('created_ticket','new_linked_ticket'))::int new_today,
              count(*) filter (where received_at >= ${start} and action in ('appended','reopened'))::int appended_today,
              count(*) filter (where received_at >= ${start} - interval '1 day' and received_at < ${start} and action in ('created_ticket','new_linked_ticket'))::int new_yesterday,
              count(*) filter (where received_at >= ${start} - interval '1 day' and received_at < ${start} and action in ('appended','reopened'))::int appended_yesterday,
              count(*) filter (where received_at >= ${start} - interval '6 days' and routed_team is not null and original_team is not null)::int routed_7d,
              count(*) filter (where received_at >= ${start} - interval '6 days' and rerouted)::int rerouted_7d,
              count(*) filter (where received_at >= ${start} - interval '13 days' and received_at < ${start} - interval '6 days' and routed_team is not null and original_team is not null)::int routed_prev_7d,
              count(*) filter (where received_at >= ${start} - interval '13 days' and received_at < ${start} - interval '6 days' and rerouted)::int rerouted_prev_7d,
              count(*) filter (where received_at >= ${start} and status = 'failed')::int failed_today,
              count(*) filter (where received_at >= ${start} - interval '1 day' and received_at < ${start} and status = 'failed')::int failed_yesterday
            from email_log`)
        ).rows;

        const [reviews] = (
          await tx.execute<{ open: number; oldest: string | null }>(
            sql`select count(*)::int open, min(created_at) oldest from reviews where status = 'open'`,
          )
        ).rows;

        const [cost] = (
          await tx.execute<{ today: number; yesterday: number }>(sql`
            select coalesce(sum(cost_usd) filter (where created_at >= ${start}), 0)::float today,
                   coalesce(sum(cost_usd) filter (where created_at >= ${start} - interval '1 day' and created_at < ${start}), 0)::float yesterday
            from agent_runs`)
        ).rows;

        const days = (
          await tx.execute<{ day: string; processed: number; failed: number; review: number }>(sql`
            select to_char(d at time zone ${tz}, 'YYYY-MM-DD') as day,
                   count(e.id) filter (where e.status in ('processed','shadow'))::int processed,
                   count(e.id) filter (where e.status = 'failed')::int failed,
                   count(e.id) filter (where e.needs_review)::int review
            from generate_series(${start} - interval '6 days', ${start}, interval '1 day') d
            left join email_log e on e.received_at >= d and e.received_at < d + interval '1 day'
            group by d order by d`)
        ).rows;

        const byCategory = (
          await tx.execute<{ day: string; category: string; n: number }>(sql`
            select to_char(date_trunc('day', received_at at time zone ${tz}), 'YYYY-MM-DD') as day, category, count(*)::int n
            from email_log
            where received_at >= ${start} - interval '6 days' and category is not null and status in ('processed','shadow')
            group by 1, 2`)
        ).rows;

        const byTeam = (
          await tx.execute<{
            team_id: string;
            name: string;
            open: number;
            at_risk: number;
            breached: number;
          }>(sql`
            select t.id team_id, t.name,
                   count(k.id) filter (where k.status not in ('resolved','closed') and k.merged_into_id is null)::int open,
                   count(k.id) filter (where k.status not in ('resolved','closed') and k.first_responded_at is null
                                        and k.first_response_due between now() and now() + interval '1 hour')::int at_risk,
                   count(k.id) filter (where k.status not in ('resolved','closed') and k.first_responded_at is null
                                        and k.first_response_due < now())::int breached
            from teams t left join tickets k on k.team_id = t.id
            group by t.id, t.name order by open desc, t.name`)
        ).rows;

        const mailboxes = (
          await tx.execute<{
            id: string;
            address: string;
            display_name: string;
            mode: string;
            health: string;
            ack_enabled: boolean;
            last_received_at: string | null;
            processed_today: number;
          }>(sql`
            select m.id, m.address, m.display_name, m.mode, m.health, m.ack_enabled,
                   max(e.received_at) last_received_at,
                   count(e.id) filter (where e.received_at >= ${start})::int processed_today
            from mailboxes m left join email_log e on e.mailbox_id = m.id
            group by m.id order by m.address`)
        ).rows;

        // Category labels and the top 6 categories (chart rule: max 6 series).
        const [active] = (
          await tx.execute<{ config: unknown }>(
            sql`select config from config_versions where status = 'active'`,
          )
        ).rows;
        const config = tenantConfigSchema.safeParse(active?.config);
        const labels = new Map(config.success ? config.data.categories.map((c) => [c.key, c.label]) : []);
        const totals = new Map<string, number>();
        for (const row of byCategory) totals.set(row.category, (totals.get(row.category) ?? 0) + row.n);
        const top = [...totals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([k]) => k);
        const otherNeeded = totals.size > 6;

        const k = kpi ?? ({} as NonNullable<typeof kpi>);
        const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
        const processedToday = k.processed_today ?? 0;
        return {
          data: {
            timezone: tz,
            kpis: {
              processedToday: { value: processedToday, previous: k.processed_yesterday ?? 0 },
              newTicketsToday: { value: k.new_today ?? 0, previous: k.new_yesterday ?? 0 },
              appendedToday: { value: k.appended_today ?? 0, previous: k.appended_yesterday ?? 0 },
              rerouteRate7d: {
                value: ratio(k.rerouted_7d ?? 0, k.routed_7d ?? 0),
                previous: ratio(k.rerouted_prev_7d ?? 0, k.routed_prev_7d ?? 0),
              },
              needsReview: { value: reviews?.open ?? 0, oldestAt: reviews?.oldest ?? null },
              failuresToday: { value: k.failed_today ?? 0, previous: k.failed_yesterday ?? 0 },
              aiCostToday: {
                valueUsd: cost?.today ?? 0,
                previousUsd: cost?.yesterday ?? 0,
                perEmailUsd: processedToday > 0 ? (cost?.today ?? 0) / processedToday : 0,
              },
            },
            days,
            categories: {
              series: [
                ...top.map((key) => ({ key, label: labels.get(key) ?? key })),
                ...(otherNeeded ? [{ key: "other", label: "Other" }] : []),
              ],
              days: days.map((d) => {
                const counts: Record<string, number> = {};
                for (const row of byCategory.filter((r) => r.day === d.day)) {
                  const key = top.includes(row.category) ? row.category : "other";
                  counts[key] = (counts[key] ?? 0) + row.n;
                }
                return { day: d.day, counts };
              }),
            },
            teams: byTeam.map((t) => ({
              id: t.team_id,
              name: t.name,
              open: t.open,
              atRisk: t.at_risk,
              breached: t.breached,
            })),
            mailboxes: mailboxes.map((m) => ({
              id: m.id,
              address: m.address,
              displayName: m.display_name,
              mode: m.mode,
              health: m.health,
              ackEnabled: m.ack_enabled,
              lastReceivedAt: m.last_received_at,
              processedToday: m.processed_today,
            })),
          },
        };
      });
    });
  };
