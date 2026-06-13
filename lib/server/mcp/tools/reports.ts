import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { reports } from "@/lib/core";
import { SubmitReportInput, ListReportsInput } from "@/lib/core/schemas/report";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerReportTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "reports.list",
    title: "List daily reports",
    description:
      "List daily activity reports (renamed fields: workCompleted, inProgress, " +
      "blockers, learnings, learningNeeded, tomorrowPlan, extraMessage). " +
      "Filters: memberId, projectId, date range from/to, full-text search.",
    inputSchema: ListReportsInput,
    actor,
    call: reports.list,
  });

  registerCoreTool(server, {
    name: "reports.submit",
    title: "Submit a daily report",
    description:
      "Submit a daily report for a member. Anti-doublon enforced by " +
      "@@unique(memberId, reportDate, projectId): a second call with the same " +
      "key returns CONFLICT. Emits report.submitted event.",
    inputSchema: SubmitReportInput,
    actor,
    call: reports.submit,
  });

  registerCoreTool(server, {
    name: "reports.has_submitted_on",
    title: "Check if a member submitted today/on a date",
    description:
      "Check whether a member has a report for a given date (today if omitted). " +
      "Useful for cron scripts or 'who's missing today' UI.",
    inputSchema: reports.HasSubmittedInput,
    actor,
    call: reports.hasSubmittedOn,
  });

  registerCoreTool(server, {
    name: "reports.missing_members",
    title: "List members who haven't submitted today",
    description:
      "Return active non-boss members without a report on a given date. " +
      "Used by chase cron + dashboard.",
    inputSchema: reports.MissingMembersInput,
    actor,
    call: reports.missingMembers,
  });

  registerCoreTool(server, {
    name: "reports.weekly_summary",
    title: "Weekly aggregated summary (per project)",
    description:
      "Aggregates reports of a week (Mon-Sun UTC) by project. Returns reportCount, " +
      "contributors with counts, raw blockers and tomorrowPlans (suitable for " +
      "LLM consumption). Pass weekOf=YYYY-MM-DD to pick a specific week.",
    inputSchema: reports.WeeklySummaryInput,
    actor,
    call: reports.weeklySummary,
  });

  registerIdTool(server, {
    name: "reports.delete",
    title: "Delete a report",
    description: "Hard delete a report. Requires reports.delete scope (admin-grade).",
    actor,
    call: reports.remove,
  });
}
