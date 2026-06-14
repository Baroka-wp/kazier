/**
 * Mapping role Member → scopes IA Actor pour OAuth.
 *
 * Quand un Member consent une connexion OAuth, le token émis hérite de ses
 * permissions. Côté MCP, on construit un Actor IA avec ces scopes.
 *
 * Convention scope OAuth = scope MCP (format "domain:action"), espace-séparée
 * dans le claim "scope" du token.
 */

import type { Perm } from "@/lib/core";

const SCOPE_BY_PERM: Record<Perm, string> = {
  "members.read": "members:read",
  "members.write": "members:write",
  "projects.read": "projects:read",
  "projects.write": "projects:write",
  "projects.finance": "projects:finance",
  "tasks.read": "tasks:read",
  "tasks.write": "tasks:write",
  "deliverables.read": "deliverables:read",
  "deliverables.write": "deliverables:write",
  "reports.read": "reports:read",
  "reports.write": "reports:write",
  "reports.delete": "reports:delete",
  "expenses.read": "expenses:read",
  "expenses.write": "expenses:write",
  "notes.read": "notes:read",
  "notes.write": "notes:write",
  "audit.read": "audit:read",
};

const HUMAN_PERMS_FOR_ROLE: Record<
  "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER",
  Perm[]
> = {
  SUPER_ADMIN: Object.keys(SCOPE_BY_PERM) as Perm[],
  PROJECT_MANAGER: [
    "members.read",
    "projects.read", "projects.write", "projects.finance",
    "tasks.read", "tasks.write",
    "deliverables.read", "deliverables.write",
    "reports.read",
    "expenses.read", "expenses.write",
    "notes.read", "notes.write",
    "audit.read",
  ],
  MEMBER: [
    "members.read",
    "projects.read",
    "tasks.read",
    "deliverables.read",
    "reports.write",
    "notes.read",
  ],
};

export function scopesForRole(role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER"): string[] {
  return HUMAN_PERMS_FOR_ROLE[role].map((p) => SCOPE_BY_PERM[p]);
}

/** "members:read tasks:write" → ["members:read", "tasks:write"] */
export function parseScope(scope: string): string[] {
  return scope.trim().split(/\s+/).filter(Boolean);
}

export function formatScope(scopes: string[]): string {
  return scopes.join(" ");
}
