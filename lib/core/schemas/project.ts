import { z } from "zod";
import { Cuid, DateOnly, Money, NonEmptyString, OptionalText, Pagination } from "./common";

export const ProjectStatusEnum = z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);

export const CreateProjectInput = z
  .object({
    name: NonEmptyString.max(120),
    description: OptionalText,
    icon: z.string().trim().max(8).optional(),
    status: ProjectStatusEnum.default("ACTIVE"),
    startDate: DateOnly.optional(),
    endDate: DateOnly.optional(),
    budgetAmount: Money.optional(),
    budgetCurrency: z.string().length(3).default("XOF"),
    contractValue: Money.optional(),
    objectives: OptionalText,
    stakeholders: OptionalText,
    memberIds: z.array(Cuid).default([]),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "startDate must be ≤ endDate",
    path: ["endDate"],
  });
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = z.object({
  name: NonEmptyString.max(120).optional(),
  description: OptionalText,
  icon: z.string().trim().max(8).optional(),
  status: ProjectStatusEnum.optional(),
  startDate: DateOnly.optional(),
  endDate: DateOnly.optional(),
  budgetAmount: Money.optional(),
  budgetCurrency: z.string().length(3).optional(),
  contractValue: Money.optional(),
  objectives: OptionalText,
  stakeholders: OptionalText,
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export const ListProjectsInput = Pagination.extend({
  search: z.string().trim().optional(),
  status: ProjectStatusEnum.optional(),
  memberId: Cuid.optional(), // filtrer "projets de ce membre"
});
export type ListProjectsInput = z.infer<typeof ListProjectsInput>;

export const AddProjectMemberInput = z.object({
  projectId: Cuid,
  memberId: Cuid,
  roleLabel: z.string().trim().max(40).optional(),
});
