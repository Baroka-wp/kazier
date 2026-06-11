/**
 * Codes d'erreur normalisés. À utiliser via `err(ERR.NOT_FOUND, …)` ou
 * directement en string.
 *
 * Important : ces codes sont stables (= contrat MCP). Toute valeur ajoutée
 * ici devient publique pour les consommateurs externes.
 */

export const ERR = {
  // ── Validation / input ───────────────────────────────────────────
  VALIDATION: "VALIDATION",                 // input ne respecte pas le schéma Zod
  INVALID_STATE: "INVALID_STATE",           // transition d'état impossible (ex: replanifier une tâche annulée)

  // ── Auth / autorisation ──────────────────────────────────────────
  UNAUTHENTICATED: "UNAUTHENTICATED",       // pas d'actor
  FORBIDDEN: "FORBIDDEN",                   // actor connu mais permissions insuffisantes

  // ── Resource ─────────────────────────────────────────────────────
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",                     // unique constraint, ex rapport en doublon
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // ── Système ──────────────────────────────────────────────────────
  INTERNAL: "INTERNAL",                     // bug applicatif, à investiguer
  DB_ERROR: "DB_ERROR",                     // Prisma error
} as const;

export type ErrorCode = (typeof ERR)[keyof typeof ERR];
