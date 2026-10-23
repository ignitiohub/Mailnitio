-- Helpdesk + AI pipeline tables: grants, RLS (ENABLE + FORCE) and tenant isolation (architecture rule 1).
-- ticket_events, agent_runs and overrides are append-only for the app, like audit_log.

GRANT SELECT, INSERT, UPDATE, DELETE ON connections, mailboxes, config_versions, teams, team_members, business_hours, sla_policies, canned_responses, kb_entries, customers, customer_emails, ticket_counters, tickets, ticket_messages, saved_views, notifications, email_threads, email_log, message_index, reviews, insight_reports TO mailnitio_app;
GRANT SELECT, INSERT ON ticket_events, agent_runs, overrides TO mailnitio_app;
--> statement-breakpoint
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON connections FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailboxes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mailboxes FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON config_versions FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON teams FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON team_members FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON business_hours FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sla_policies FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON canned_responses FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kb_entries FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE customer_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_emails FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customer_emails FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE ticket_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_counters FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ticket_counters FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tickets FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ticket_messages FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saved_views FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_threads FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_log FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE message_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_index FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message_index FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reviews FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON insight_reports FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ticket_events FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agent_runs FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON overrides FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
--> statement-breakpoint
