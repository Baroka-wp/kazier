import { z } from "zod";
import { Cuid, DateOnly, OptionalText, Pagination } from "./common";

export const SubmitReportInput = z.object({
  memberId: Cuid,
  projectId: Cuid.optional(),
  reportDate: DateOnly.optional(), // si absent, today UTC
  workCompleted: OptionalText,
  inProgress: OptionalText,
  blockers: OptionalText,
  learnings: OptionalText,
  learningNeeded: OptionalText,
  tomorrowPlan: OptionalText,
  extraMessage: OptionalText,
});
export type SubmitReportInput = z.infer<typeof SubmitReportInput>;

export const ListReportsInput = Pagination.extend({
  memberId: Cuid.optional(),
  projectId: Cuid.optional(),
  from: DateOnly.optional(),
  to: DateOnly.optional(),
  search: z.string().trim().optional(),
});
export type ListReportsInput = z.infer<typeof ListReportsInput>;
