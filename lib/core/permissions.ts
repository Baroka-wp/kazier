/**
 * Permissions par rôle. Utilisé par chaque fonction core qui mute.
 *
 * Convention : `requirePerm(actor, "tasks.write")` retourne Err(FORBIDDEN)
 * si l'actor n'a pas le droit. Pour les lectures, on lit par défaut → pas
 * d'appel à requirePerm sauf pour des données sensibles (ex: finance).
 */

import type { Actor } from "./actor";
import { err, ok, type Result } from "./result";
import { ERR } from "./errors";

export type Perm =
  | "members.read"
  | "members.write"
  | "projects.read"
  | "projects.write"
  | "projects.finance" // voir budget/dépenses
  | "tasks.read"
  | "tasks.write"
  | "deliverables.read"
  | "deliverables.write"
  | "reports.read"
  | "reports.write"
  | "reports.delete"
  | "expenses.read"
  | "expenses.write"
  | "notes.read"
  | "notes.write"
  | "audit.read";

const HUMAN_PERMS: Record<"SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER", Set<Perm>> = {
  SUPER_ADMIN: new Set<Perm>([
    "members.read", "members.write",
    "projects.read", "projects.write", "projects.finance",
    "tasks.read", "tasks.write",
    "deliverables.read", "deliverables.write",
    "reports.read", "reports.write", "reports.delete",
    "expenses.read", "expenses.write",
    "notes.read", "notes.write",
    "audit.read",
  ]),
  PROJECT_MANAGER: new Set<Perm>([
    "members.read",
    "projects.read", "projects.write", "projects.finance",
    "tasks.read", "tasks.write",
    "deliverables.read", "deliverables.write",
    "reports.read",
    "expenses.read", "expenses.write",
    "notes.read", "notes.write",
    "audit.read",
  ]),
  MEMBER: new Set<Perm>([
    "members.read",
    "projects.read",
    "tasks.read",
    "deliverables.read",
    "reports.write", // soumettre son propre rapport
    "notes.read",
  ]),
};

export function hasPerm(actor: Actor, perm: Perm): boolean {
  if (actor.type === "SYSTEM") return true;
  if (actor.type === "HUMAN") return HUMAN_PERMS[actor.role].has(perm);
  if (actor.type === "IA") {
    // L'IA a les permissions accordées par ses scopes.
    // Format scopes : "tasks:write" → perm "tasks.write"
    const scopeForm = perm.replace(".", ":");
    return actor.scopes.includes(scopeForm) || actor.scopes.includes("*");
  }
  return false;
}

export function requirePerm(actor: Actor, perm: Perm): Result<true> {
  return hasPerm(actor, perm) ? ok(true) : err(ERR.FORBIDDEN, `Permission denied: ${perm}`);
}
