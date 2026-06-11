import { z } from "zod";
import { Cuid, DateOnly, NonEmptyString, OptionalText, Pagination } from "./common";

export const CadenceEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "MILESTONE"]);
export const DeliverableStatusEnum = z.enum(["PLANNED", "IN_PROGRESS", "DONE", "MISSED"]);

export const CreateDeliverableInput = z.object({
  projectId: Cuid,
  parentId: Cuid.optional(),
  title: NonEmptyString.max(200),
  description: OptionalText,
  cadence: CadenceEnum,
  dueDate: DateOnly,
  status: DeliverableStatusEnum.default("PLANNED"),
});
export type CreateDeliverableInput = z.infer<typeof CreateDeliverableInput>;

export const UpdateDeliverableInput = CreateDeliverableInput.partial().omit({ projectId: true });
export type UpdateDeliverableInput = z.infer<typeof UpdateDeliverableInput>;

export const ListDeliverablesInput = Pagination.extend({
  projectId: Cuid.optional(),
  cadence: CadenceEnum.optional(),
  status: DeliverableStatusEnum.optional(),
  dueBefore: DateOnly.optional(),
  dueAfter: DateOnly.optional(),
});
export type ListDeliverablesInput = z.infer<typeof ListDeliverablesInput>;
