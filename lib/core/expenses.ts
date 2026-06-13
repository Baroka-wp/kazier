/**
 * Fonctions métier Expense + finance dérivée par projet.
 *
 * Toutes les fonctions nécessitent `expenses.*` ; les agrégats financiers
 * (`budgetStatus`) demandent en plus `projects.finance`.
 *
 * Émet :
 *   - "expense.added"
 *   - "expense.budget_threshold"  si spent/budget franchit 50/80/100%.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ok, err, type Result } from "./result";
import { ERR } from "./errors";
import { validate } from "./validate";
import { requirePerm, hasPerm } from "./permissions";
import { logAction } from "./audit";
import { events } from "./events";
import { actorMemberId, type Actor } from "./actor";
import { AddExpenseInput, ListExpensesInput, ExpenseCategoryEnum } from "./schemas/expense";
import { Cuid } from "./schemas/common";
import { z } from "zod";

// ── Types de sortie ──────────────────────────────────────────────────────

export type ExpenseRow = {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  currency: string;
  category: z.infer<typeof ExpenseCategoryEnum>;
  description: string | null;
  incurredAt: Date;
  createdById: string;
  createdByName: string;
  createdAt: Date;
};

type ExpenseWithRels = Prisma.ExpenseGetPayload<{
  include: {
    project: { select: { name: true } };
    createdBy: { select: { firstName: true; lastName: true } };
  };
}>;

function toExpenseRow(e: ExpenseWithRels): ExpenseRow {
  return {
    id: e.id,
    projectId: e.projectId,
    projectName: e.project.name,
    amount: Number(e.amount),
    currency: e.currency,
    category: e.category,
    description: e.description,
    incurredAt: e.incurredAt,
    createdById: e.createdById,
    createdByName: `${e.createdBy.firstName} ${e.createdBy.lastName}`.trim(),
    createdAt: e.createdAt,
  };
}

const includeExpenseRels = {
  project: { select: { name: true } },
  createdBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude;

// ── Add ───────────────────────────────────────────────────────────────────

export async function add(actor: Actor, rawInput: unknown): Promise<Result<ExpenseRow>> {
  const perm = requirePerm(actor, "expenses.write");
  if (!perm.ok) return perm;

  const v = validate(AddExpenseInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  const createdById = actorMemberId(actor);
  if (!createdById) {
    return err(ERR.UNAUTHENTICATED, "Cannot add expense without a member identity");
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true, budgetAmount: true, budgetCurrency: true },
    });
    if (!project) return err(ERR.NOT_FOUND, `Project ${data.projectId} not found`);

    const created = await prisma.expense.create({
      data: {
        projectId: data.projectId,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description,
        incurredAt: data.incurredAt,
        createdById,
      },
      include: includeExpenseRels,
    });

    await logAction({
      actor,
      action: "expense.add",
      entity: "expense",
      entityId: created.id,
      diff: { amount: data.amount, category: data.category, projectId: data.projectId },
    });
    events.emit("expense.added", {
      expenseId: created.id,
      projectId: data.projectId,
      actorId: createdById,
    });

    // Seuils budgétaires : si on franchit 50/80/100%, émettre threshold
    if (project.budgetAmount && Number(project.budgetAmount) > 0) {
      await maybeEmitThreshold(data.projectId, Number(project.budgetAmount));
    }

    return ok(toExpenseRow(created));
  } catch (e) {
    console.error("[core.expenses.add]", e);
    return err(ERR.DB_ERROR, "Failed to add expense");
  }
}

async function maybeEmitThreshold(projectId: string, budget: number) {
  const agg = await prisma.expense.aggregate({
    where: { projectId },
    _sum: { amount: true },
  });
  const spent = Number(agg._sum.amount ?? 0);
  const ratio = spent / budget;
  // On émet à chaque ajout — c'est aux listeners (Slack) de dédupliquer
  // si nécessaire en se basant sur l'audit ou en stockant un état séparé.
  if (ratio >= 0.5) {
    events.emit("expense.budget_threshold", { projectId, ratio });
  }
}

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{ data: ExpenseRow[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const perm = requirePerm(actor, "expenses.read");
  if (!perm.ok) return perm;

  const v = validate(ListExpensesInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, projectId, category, from, to } = v.data;

  const where: Prisma.ExpenseWhereInput = {};
  if (projectId) where.projectId = projectId;
  if (category) where.category = category;
  if (from || to) {
    where.incurredAt = {};
    if (from) where.incurredAt.gte = from;
    if (to) where.incurredAt.lte = to;
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: includeExpenseRels,
        orderBy: { incurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toExpenseRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.expenses.list]", e);
    return err(ERR.DB_ERROR, "Failed to list expenses");
  }
}

// ── Remove ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "expenses.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Expense ${id} not found`);

    await prisma.expense.delete({ where: { id } });
    await logAction({
      actor,
      action: "expense.delete",
      entity: "expense",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.expenses.remove]", e);
    return err(ERR.DB_ERROR, "Failed to delete expense");
  }
}

// ── Budget status (le KPI clé du pilotage finance) ──────────────────────

export const BudgetStatusInput = z.object({ projectId: Cuid });

export type BudgetStatus = {
  projectId: string;
  projectName: string;
  budgetAmount: number | null;
  contractValue: number | null;
  currency: string;
  spent: number;
  remaining: number | null;
  ratio: number | null; // spent / budgetAmount
  marginEstimate: number | null; // contractValue - spent
  byCategory: Record<string, number>;
};

export async function budgetStatus(actor: Actor, rawInput: unknown): Promise<Result<BudgetStatus>> {
  // Donnée sensible — exige projects.finance
  const perm = requirePerm(actor, "projects.finance");
  if (!perm.ok) return perm;

  const v = validate(BudgetStatusInput, rawInput);
  if (!v.ok) return v;
  const { projectId } = v.data;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        budgetAmount: true,
        contractValue: true,
        budgetCurrency: true,
      },
    });
    if (!project) return err(ERR.NOT_FOUND, `Project ${projectId} not found`);

    const [total, byCat] = await Promise.all([
      prisma.expense.aggregate({ where: { projectId }, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { projectId },
        _sum: { amount: true },
      }),
    ]);

    const spent = Number(total._sum.amount ?? 0);
    const budget = project.budgetAmount ? Number(project.budgetAmount) : null;
    const contract = project.contractValue ? Number(project.contractValue) : null;

    const byCategory: Record<string, number> = {};
    for (const c of byCat) {
      byCategory[c.category] = Number(c._sum.amount ?? 0);
    }

    return ok({
      projectId: project.id,
      projectName: project.name,
      budgetAmount: budget,
      contractValue: contract,
      currency: project.budgetCurrency,
      spent,
      remaining: budget !== null ? budget - spent : null,
      ratio: budget !== null && budget > 0 ? spent / budget : null,
      marginEstimate: contract !== null ? contract - spent : null,
      byCategory,
    });
  } catch (e) {
    console.error("[core.expenses.budgetStatus]", e);
    return err(ERR.DB_ERROR, "Failed to compute budget status");
  }
}

export { hasPerm };
