/**
 * Pont Zod → Result. Évite d'écrire `safeParse` + branchement à chaque fonction.
 *
 * Usage :
 *   const v = validate(CreateMemberInput, input);
 *   if (!v.ok) return v;
 *   const data = v.data; // typé
 */

import type { ZodSchema, ZodError } from "zod";
import { ERR } from "./errors";
import { err, ok, type Result } from "./result";

export function validate<T>(schema: ZodSchema<T>, input: unknown): Result<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(ERR.VALIDATION, formatZodError(parsed.error), parsed.error.flatten());
}

function formatZodError(e: ZodError): string {
  const first = e.issues[0];
  if (!first) return "Validation failed";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
