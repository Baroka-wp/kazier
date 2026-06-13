/**
 * Helpers MCP — factorisation du pattern "tool = shape Zod + appel core".
 *
 * Le SDK MCP veut un "raw shape" (dict de Zod). On accepte ici un ZodRawShape
 * directement plutôt qu'un ZodObject — chaque tool définit son shape inline.
 * Pour les schemas core qui ont .refine() / .transform(), on duplique le
 * shape sans transforms (c'est OK : validate() côté core re-valide).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Result, Actor } from "@/lib/core";
import { z, type ZodRawShape } from "zod";

type CoreCall<I, O> = (actor: Actor, input: I) => Promise<Result<O>>;

/**
 * Extrait un ZodRawShape utilisable par MCP depuis n'importe quel schema
 * Zod. Gère : ZodObject (direct), ZodEffects (refine/transform → on prend
 * le schema sous-jacent récursivement).
 */
export function toShape(schema: z.ZodTypeAny): ZodRawShape {
  // Déballe les wrappers .refine() / .transform()
  let s: z.ZodTypeAny = schema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((s as any)._def?.schema) s = (s as any)._def.schema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((s as any)._def?.innerType) s = (s as any)._def.innerType;

  // Si on a un ZodObject, on retourne son shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape = (s as any).shape ?? (s as any)._def?.shape?.();
  if (shape) return shape as ZodRawShape;

  // Fallback : on wrappe en un seul champ "input"
  return { input: schema } as ZodRawShape;
}

/**
 * Enregistre un tool MCP. `inputSchema` peut être :
 *   - un ZodObject (ex `CreateMemberInput`)
 *   - un ZodEffects (`z.object(...).refine(...)`) — toShape() déballe
 *   - un raw shape (dict de Zod) — passé tel quel
 * On extrait toujours un shape correct via `toShape()`.
 */
export function registerCoreTool<I, O>(
  server: McpServer,
  config: {
    name: string;
    title: string;
    description: string;
    inputSchema: z.ZodTypeAny | ZodRawShape;
    actor: () => Actor;
    call: CoreCall<I, O>;
  }
): void {
  const shape =
    typeof config.inputSchema === "object" && "_def" in config.inputSchema
      ? toShape(config.inputSchema as z.ZodTypeAny)
      : (config.inputSchema as ZodRawShape);

  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: shape,
    },
    async (args) => {
      const actor = config.actor();
      const result = await config.call(actor, args as I);

      if (!result.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ code: result.code, message: result.message }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );
}

/** Variante pour les tools qui ne prennent qu'un id en paramètre. */
export function registerIdTool<O>(
  server: McpServer,
  config: {
    name: string;
    title: string;
    description: string;
    actor: () => Actor;
    call: (actor: Actor, id: string) => Promise<Result<O>>;
  }
): void {
  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: { id: z.string().describe("Cuid of the entity") },
    },
    async (args: { id: string }) => {
      const actor = config.actor();
      const result = await config.call(actor, args.id);
      if (!result.ok) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ code: result.code, message: result.message }) },
          ],
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
      };
    }
  );
}
