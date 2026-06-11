import { z } from "zod";
import { Cuid, DateOnly, Money, Pagination } from "./common";

export const ExpenseCategoryEnum = z.enum([
  "SALARY",
  "PURCHASE",
  "SUBCONTRACT",
  "TRAVEL",
  "SOFTWARE",
  "OTHER",
]);

export const AddExpenseInput = z.object({
  projectId: Cuid,
  amount: Money,
  currency: z.string().length(3).default("XOF"),
  category: ExpenseCategoryEnum,
  description: z.string().trim().max(500).optional(),
  incurredAt: DateOnly,
});
export type AddExpenseInput = z.infer<typeof AddExpenseInput>;

export const ListExpensesInput = Pagination.extend({
  projectId: Cuid.optional(),
  category: ExpenseCategoryEnum.optional(),
  from: DateOnly.optional(),
  to: DateOnly.optional(),
});
export type ListExpensesInput = z.infer<typeof ListExpensesInput>;
