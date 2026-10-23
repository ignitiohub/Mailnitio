import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

/**
 * Workspace roles. Owner and admin manage the workspace and members; the other roles get product
 * permissions as those products are built (tickets, review, campaigns...).
 */
export const statements = {
  ...defaultStatements,
  billing: ["read", "update"],
  apiKey: ["create", "revoke"],
  auditLog: ["read"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    billing: ["read", "update"],
    apiKey: ["create", "revoke"],
    auditLog: ["read"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    billing: ["read"],
    apiKey: ["create", "revoke"],
    auditLog: ["read"],
  }),
  supervisor: ac.newRole({ ...memberAc.statements, auditLog: ["read"] }),
  agent: ac.newRole({ ...memberAc.statements }),
  reviewer: ac.newRole({ ...memberAc.statements }),
  viewer: ac.newRole({ ...memberAc.statements }),
  developer: ac.newRole({ ...memberAc.statements, apiKey: ["create", "revoke"] }),
  marketer: ac.newRole({ ...memberAc.statements }),
};
