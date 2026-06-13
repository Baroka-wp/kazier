/**
 * Tool MCP : audit.timeline
 *
 * Permet à l'IA de répondre à "qu'est-ce qu'on a changé sur ce projet/tâche
 * la semaine dernière ?". S'appuie sur AuditLog (rempli par chaque mutation
 * via lib/core/audit.logAction()).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { entityTimeline, requirePerm, prisma, type Actor } from "@/lib/core";
import { z } from "zod";

export function registerAuditTools(server: McpServer, actor: () => Actor): void {
  server.registerTool(
    "audit.timeline",
    {
      title: "Get audit log for an entity",
      description:
        "Returns the timeline of actions on a specific entity (project, task, " +
        "report, deliverable, expense, note, member). Each entry has actor, " +
        "action (e.g. project.update), timestamp, and diff. Use this to answer " +
        "'what happened on X recently?'.",
      inputSchema: {
        entity: z
          .enum(["project", "task", "report", "deliverable", "expense", "note", "member"])
          .describe("Entity type"),
        entityId: z.string().describe("cuid of the entity"),
        limit: z.number().int().min(1).max(200).default(50),
      },
    },
    async (args: { entity: string; entityId: string; limit?: number }) => {
      const a = actor();
      const perm = requirePerm(a, "audit.read");
      if (!perm.ok) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ code: perm.code, message: perm.message }) },
          ],
        };
      }
      const timeline = await entityTimeline(args.entity, args.entityId, args.limit);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(timeline, null, 2) }],
      };
    }
  );

  server.registerTool(
    "audit.recent",
    {
      title: "Recent system-wide activity",
      description:
        "Return the N most recent audit entries across all entities. Useful for " +
        "a global 'what changed lately?' overview.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).default(50),
        action: z.string().optional().describe("Optional action filter (e.g. 'task.create')"),
        entity: z.string().optional().describe("Optional entity filter"),
      },
    },
    async (args: { limit?: number; action?: string; entity?: string }) => {
      const a = actor();
      const perm = requirePerm(a, "audit.read");
      if (!perm.ok) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: JSON.stringify({ code: perm.code, message: perm.message }) },
          ],
        };
      }
      const rows = await prisma.auditLog.findMany({
        where: {
          ...(args.action ? { action: args.action } : {}),
          ...(args.entity ? { entity: args.entity } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 50,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    }
  );
}
