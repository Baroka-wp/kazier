/**
 * Pont Zod → Result. Évite d'écrire `safeParse` + branchement à chaque fonction.
 *
 * Usage :
 *   const v = validate(CreateMemberInput, input);
 *   if (!v.ok) return v;
 *   const data = v.data; // typé via z.infer<typeof schema>
 *
 * Note typing : on accepte `z.ZodTypeAny` au lieu de `ZodSchema<T>` pour
 * supporter les schemas avec `.refine()` (ZodEffects) sans forcer le typing.
 * Le `Result<z.infer<S>>` retourné préserve le bon type via le generic S.
 */

import { z, type ZodError } from "zod";
import { ERR } from "./errors";
import { err, ok, type Result } from "./result";

export function validate<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown
): Result<z.infer<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data as z.infer<S>);
  return err(ERR.VALIDATION, formatZodError(parsed.error), parsed.error.flatten());
}

function formatZodError(e: ZodError): string {
  const first = e.issues[0];
  if (!first) return "Validation failed";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
