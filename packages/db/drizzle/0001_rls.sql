-- Row-level security and runtime roles (architecture rule 1).
--
-- Roles:
--   owner (migration role)  owns every table; never used by running services.
--   mailnitio_app           API and worker. Non-owner, NOBYPASSRLS. Sees only the workspace set by
--                           withTenant() via set_config('app.workspace_id', <id>, true).
--   mailnitio_auth          Better Auth only. Full access to identity tables and workspace membership,
--                           through explicit policies (no BYPASSRLS needed, which Neon does not grant).
-- Passwords are not stored here; the migrate script sets them from APP_DB_PASSWORD / AUTH_DB_PASSWORD.
-- New tenant tables must add GRANTs, ENABLE + FORCE RLS and a tenant_isolation policy in their migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mailnitio_app') THEN
    CREATE ROLE mailnitio_app NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mailnitio_auth') THEN
    CREATE ROLE mailnitio_auth NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO mailnitio_app, mailnitio_auth;
--> statement-breakpoint

-- pg-boss creates and owns its own "pgboss" schema at worker start.
DO $$
BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO mailnitio_app', current_database());
END
$$;
--> statement-breakpoint

-- The workspace for the current transaction; NULL (no rows visible) when withTenant was not used.
CREATE OR REPLACE FUNCTION app_current_workspace_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.workspace_id', true), '')::uuid $$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------------------------------
-- Grants: mailnitio_app
-- ---------------------------------------------------------------------------------------------------
GRANT SELECT, UPDATE ON workspaces TO mailnitio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON members, invitations, api_keys, feature_flag_overrides TO mailnitio_app;
GRANT SELECT, INSERT ON workspace_keys, usage_events TO mailnitio_app;
-- Audit log is append-only for the application.
GRANT SELECT, INSERT ON audit_log TO mailnitio_app;
-- Identity: only display columns, and only for members of the current workspace (policy below).
GRANT SELECT (id, name, email, image, two_factor_enabled, created_at) ON users TO mailnitio_app;
-- Platform tables (not tenant data).
GRANT SELECT, INSERT, UPDATE ON leads TO mailnitio_app;
GRANT SELECT, INSERT ON waitlist TO mailnitio_app;
GRANT SELECT ON feature_flags TO mailnitio_app;
--> statement-breakpoint

-- ---------------------------------------------------------------------------------------------------
-- Grants: mailnitio_auth
-- ---------------------------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, accounts, verifications, two_factors TO mailnitio_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces, members, invitations TO mailnitio_auth;
GRANT INSERT ON workspace_keys, audit_log TO mailnitio_auth;
--> statement-breakpoint

-- ---------------------------------------------------------------------------------------------------
-- Row-level security: ENABLE + FORCE (FORCE also binds the table owner).
-- ---------------------------------------------------------------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE members FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Tenant isolation for the application role.
CREATE POLICY tenant_isolation ON workspaces FOR ALL TO mailnitio_app
  USING (id = app_current_workspace_id()) WITH CHECK (id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON members FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON invitations FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON workspace_keys FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON api_keys FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON audit_log FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON usage_events FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation ON feature_flag_overrides FOR ALL TO mailnitio_app
  USING (workspace_id = app_current_workspace_id()) WITH CHECK (workspace_id = app_current_workspace_id());
-- Users are visible to the app only when they are members of the current workspace.
CREATE POLICY workspace_members_only ON users FOR SELECT TO mailnitio_app
  USING (EXISTS (SELECT 1 FROM members m WHERE m.user_id = users.id AND m.workspace_id = app_current_workspace_id()));
--> statement-breakpoint

-- The auth service manages identity and membership across workspaces (sign-up, invitations).
CREATE POLICY auth_service ON users FOR ALL TO mailnitio_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_service ON workspaces FOR ALL TO mailnitio_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_service ON members FOR ALL TO mailnitio_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_service ON invitations FOR ALL TO mailnitio_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_service_insert ON workspace_keys FOR INSERT TO mailnitio_auth WITH CHECK (true);
CREATE POLICY auth_service_insert ON audit_log FOR INSERT TO mailnitio_auth WITH CHECK (true);
