/**
 * Briques Zod réutilisables. À importer dans chaque schéma entité.
 */

import { z } from "zod";

/** cuid identifier (Member, Project, Task…). */
export const Cuid = z.string().regex(/^[a-z0-9]{20,32}$/, "Invalid cuid");

export const Email = z.string().email().toLowerCase().trim();

/** Date "YYYY-MM-DD" — Postgres @db.Date. */
export const DateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .transform((s) => new Date(s + "T00:00:00.000Z"));

/** Datetime ISO ou objet Date.
 *  Note : sur le wire MCP (JSON), c'est toujours un string. z.date() est
 *  toléré pour les appels internes node-to-node mais le JSON Schema généré
 *  pour MCP ne montre que la branche string. */
export const DateTimeLike = z
  .string()
  .datetime()
  .transform((v) => new Date(v));

export const Money = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .pipe(z.number().nonnegative().finite());

export const Pagination = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof Pagination>;

/** Texte trimmé non vide. */
export const NonEmptyString = z.string().trim().min(1);

/** Texte trimmé optionnel — vide ou whitespace → undefined. */
export const OptionalText = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .optional();
