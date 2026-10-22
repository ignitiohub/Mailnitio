import {
  formatDateTimeForEmail,
  leadConfirmationTemplate,
  leadTeamNotificationTemplate,
  type SystemMailer,
} from "@mailnitio/core";
import { type DatabaseHandle, eq, schema } from "@mailnitio/db";
import type { Logger } from "@mailnitio/observability";

export interface NotifyLeadDeps {
  db: DatabaseHandle;
  mailer: SystemMailer;
  logger: Logger;
  teamEmail: string;
  slackWebhookUrl?: string;
  fetchImpl?: typeof fetch;
}

type Lead = typeof schema.leads.$inferSelect;
type Flag = "teamNotifiedAt" | "requesterNotifiedAt" | "slackNotifiedAt";

/**
 * Notify the team (email + optional Slack) and confirm to the requester. Each channel has its own
 * flag, so a retry after a partial failure never sends the same message twice.
 */
export async function notifyLead(deps: NotifyLeadDeps, leadId: string): Promise<void> {
  const [lead] = await deps.db.withPlatform((tx) =>
    tx.select().from(schema.leads).where(eq(schema.leads.id, leadId)),
  );
  if (!lead) {
    deps.logger.warn({ leadId }, "lead not found; skipping notification");
    return;
  }

  const summary = {
    ...lead,
    preferredSlot: lead.preferredSlot ? formatDateTimeForEmail(lead.preferredSlot) : null,
  };

  const markDone = (flag: Flag) =>
    deps.db.withPlatform((tx) =>
      tx
        .update(schema.leads)
        .set({ [flag]: new Date() })
        .where(eq(schema.leads.id, leadId)),
    );

  if (!lead.teamNotifiedAt) {
    await deps.mailer.send({
      to: deps.teamEmail,
      replyTo: lead.workEmail,
      ...leadTeamNotificationTemplate(summary),
    });
    await markDone("teamNotifiedAt");
  }

  if (deps.slackWebhookUrl && !lead.slackNotifiedAt) {
    await postToSlack(deps, lead, summary.preferredSlot);
    await markDone("slackNotifiedAt");
  }

  if (!lead.requesterNotifiedAt) {
    await deps.mailer.send({ to: lead.workEmail, ...leadConfirmationTemplate(summary) });
    await markDone("requesterNotifiedAt");
  }

  deps.logger.info({ leadId }, "lead notifications complete");
}

async function postToSlack(deps: NotifyLeadDeps, lead: Lead, slot: string | null) {
  const text = [
    `*New demo request: ${lead.company}*`,
    `${lead.name} (${lead.role}), ${lead.country}`,
    `Volume: ${lead.monthlyVolume} · Platform: ${lead.emailPlatform} · CRM: ${lead.crm}`,
    slot ? `Preferred slot: ${slot}` : "No slot chosen",
  ].join("\n");
  const response = await (deps.fetchImpl ?? fetch)(deps.slackWebhookUrl as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Slack webhook returned ${response.status}`);
}
