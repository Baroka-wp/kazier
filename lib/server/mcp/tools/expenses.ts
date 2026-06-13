import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { expenses } from "@/lib/core";
import { AddExpenseInput, ListExpensesInput } from "@/lib/core/schemas/expense";
import { registerCoreTool, registerIdTool } from "../helpers";
import type { Actor } from "@/lib/core";

export function registerExpenseTools(server: McpServer, actor: () => Actor): void {
  registerCoreTool(server, {
    name: "expenses.list",
    title: "List expenses",
    description:
      "List project expenses (categories: SALARY|PURCHASE|SUBCONTRACT|TRAVEL|" +
      "SOFTWARE|OTHER). Filters by project, category, date range.",
    inputSchema: ListExpensesInput,
    actor,
    call: expenses.list,
  });

  registerCoreTool(server, {
    name: "expenses.add",
    title: "Add an expense",
    description:
      "Add an expense imputed to a project. createdBy = the calling actor's " +
      "member identity. If spent crosses 50%/80%/100% of the project's budget, " +
      "emits expense.budget_threshold (Slack alert deduplicated daily).",
    inputSchema: AddExpenseInput,
    actor,
    call: expenses.add,
  });

  registerIdTool(server, {
    name: "expenses.delete",
    title: "Delete an expense",
    description: "Hard delete an expense.",
    actor,
    call: expenses.remove,
  });

  registerCoreTool(server, {
    name: "expenses.budget_status",
    title: "Project budget status (KPI)",
    description:
      "The finance KPI for a project. Returns spent, remaining, ratio " +
      "(spent/budget), marginEstimate (contractValue-spent), breakdown by " +
      "category. Requires projects.finance scope.",
    inputSchema: expenses.BudgetStatusInput,
    actor,
    call: expenses.budgetStatus,
  });
}
