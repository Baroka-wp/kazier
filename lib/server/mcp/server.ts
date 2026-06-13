/**
 * Construction du serveur MCP Kazier.
 *
 * Le serveur est INSTANTIÉ PAR REQUÊTE — il porte un Actor IA spécifique
 * (celui authentifié via Bearer), pour que les tools tapent bien dans
 * lib/core avec le bon acteur. C'est plus simple et plus propre que de
 * partager une instance globale et d'avoir à muter un AsyncLocalStorage.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Actor } from "@/lib/core";

import { registerMemberTools } from "./tools/members";
import { registerProjectTools } from "./tools/projects";
import { registerTaskTools } from "./tools/tasks";
import { registerDeliverableTools } from "./tools/deliverables";
import { registerReportTools } from "./tools/reports";
import { registerExpenseTools } from "./tools/expenses";
import { registerNoteTools } from "./tools/notes";
import { registerAuditTools } from "./tools/audit";

export const KAZIER_MCP_SERVER_INFO = {
  name: "kazier",
  version: "0.1.0",
} as const;

export function createKazierMcpServer(actor: Actor): McpServer {
  const server = new McpServer(KAZIER_MCP_SERVER_INFO, {
    capabilities: { tools: {} },
    instructions:
      "Kazier — project & team management for Africa Samurai. Use these tools " +
      "to inspect projects, tasks, daily reports, deliverables, expenses, notes, " +
      "and the audit trail. IDs are cuids. Statuses are uppercase enums " +
      "(TODO/IN_PROGRESS/REVIEW/DONE/CANCELLED for tasks). Dates: 'YYYY-MM-DD' " +
      "for date-only fields, ISO 8601 otherwise. All mutations are audited " +
      "automatically.",
  });

  const actorRef = () => actor;
  registerMemberTools(server, actorRef);
  registerProjectTools(server, actorRef);
  registerTaskTools(server, actorRef);
  registerDeliverableTools(server, actorRef);
  registerReportTools(server, actorRef);
  registerExpenseTools(server, actorRef);
  registerNoteTools(server, actorRef);
  registerAuditTools(server, actorRef);

  return server;
}
