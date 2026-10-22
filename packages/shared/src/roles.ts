export const HELPDESK_ROLES = ["owner", "admin", "supervisor", "agent", "reviewer", "viewer"] as const;
export const SEND_ROLES = ["developer", "marketer"] as const;
export const WORKSPACE_ROLES = [...HELPDESK_ROLES, ...SEND_ROLES] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Roles that must have TOTP two-factor authentication enabled before using the app. */
export const MFA_REQUIRED_ROLES: readonly WorkspaceRole[] = ["owner", "admin"];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  supervisor: "Supervisor",
  agent: "Agent",
  reviewer: "Reviewer",
  viewer: "Viewer",
  developer: "Developer",
  marketer: "Marketer",
};

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}
