/**
 * Result type — utilisé partout dans lib/core pour les fonctions qui peuvent
 * échouer de manière prévisible (validation, not found, forbidden, conflit…).
 *
 * Convention : on NE throw PAS pour les erreurs métier. On throw uniquement
 * pour les conditions inattendues (erreur DB, bug applicatif). Les Result
 * encodent les échecs prévus.
 *
 * Forme stable : { ok: true, data } | { ok: false, code, message, cause? }
 * → c'est aussi la forme renvoyée par les tools MCP, donc pas de transformation
 *   entre lib/core, Server Actions, et MCP.
 */

import type { ErrorCode } from "./errors";

export type Ok<T> = { ok: true; data: T };
export type Err = {
  ok: false;
  code: ErrorCode;
  message: string;
  /** Pour debug — détails non destinés à l'utilisateur final (validation Zod, etc.) */
  cause?: unknown;
};

export type Result<T> = Ok<T> | Err;

// ── Constructeurs ─────────────────────────────────────────────────────────

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });

export const err = (code: ErrorCode, message: string, cause?: unknown): Err => ({
  ok: false,
  code,
  message,
  cause,
});

// ── Helpers ───────────────────────────────────────────────────────────────

export const isOk = <T>(r: Result<T>): r is Ok<T> => r.ok === true;
export const isErr = <T>(r: Result<T>): r is Err => r.ok === false;

/** Mappe la valeur d'un Ok sans toucher aux Err. */
export function map<T, U>(r: Result<T>, fn: (v: T) => U): Result<U> {
  if (r.ok) return ok(fn(r.data));
  return r;
}

/** Chaîne deux opérations Result (équivalent à flatMap). */
export async function andThen<T, U>(
  r: Result<T> | Promise<Result<T>>,
  fn: (v: T) => Result<U> | Promise<Result<U>>
): Promise<Result<U>> {
  const resolved = await r;
  if (!resolved.ok) return resolved;
  return await fn(resolved.data);
}

/**
 * Extrait la donnée — throw si erreur. À n'utiliser que dans du code de test
 * ou quand on a déjà vérifié `isOk`.
 */
export function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.data;
  throw new Error(`unwrap on Err: ${r.code} — ${r.message}`);
}
