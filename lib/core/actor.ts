/**
 * Actor — qui est en train d'effectuer une opération.
 *
 * Injecté explicitement dans CHAQUE fonction core mutante. Permet à la même
 * fonction d'être appelée depuis :
 *   - une Server Action Next (actor = HUMAN, memberId session)
 *   - un tool MCP appelé par Claude (actor = IA, apiKeyId)
 *   - un cron worker (actor = SYSTEM)
 *
 * Le core ne sait pas d'où vient l'appel — c'est le wrapper (Server Action
 * ou MCP server) qui construit l'Actor et le passe.
 */

export type Actor =
  | { type: "HUMAN"; memberId: string; role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER" }
  | { type: "IA"; apiKeyId: string; scopes: string[]; memberId?: string }
  | { type: "SYSTEM"; label: string };

export const systemActor = (label: string): Actor => ({ type: "SYSTEM", label });

export function actorMemberId(a: Actor): string | null {
  if (a.type === "HUMAN") return a.memberId;
  if (a.type === "IA") return a.memberId ?? null;
  return null;
}

export function actorLabel(a: Actor): string {
  if (a.type === "HUMAN") return `member:${a.memberId}`;
  if (a.type === "IA") return `ia:${a.apiKeyId}`;
  return `system:${a.label}`;
}
