import { z } from "zod";
import { Cuid, DateTimeLike, NonEmptyString, OptionalText, Pagination } from "./common";

export const TaskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]);
export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const CreateTaskInput = z.object({
  title: NonEmptyString.max(200),
  description: OptionalText,
  projectId: Cuid.optional(),
  deliverableId: Cuid.optional(),
  status: TaskStatusEnum.default("TODO"),
  priority: PriorityEnum.default("MEDIUM"),
  startDate: DateTimeLike.optional(),
  dueDate: DateTimeLike.optional(),
  estimatedHours: z.number().positive().max(999).optional(),
  assigneeIds: z.array(Cuid).default([]),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = CreateTaskInput.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const ListTasksInput = Pagination.extend({
  search: z.string().trim().optional(),
  projectId: Cuid.optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: Cuid.optional(),
});
export type ListTasksInput = z.infer<typeof ListTasksInput>;

export const ChangeTaskStatusInput = z.object({
  taskId: Cuid,
  status: TaskStatusEnum,
  actualHours: z.number().nonnegative().max(999).optional(),
});

export const AssignTaskInput = z.object({
  taskId: Cuid,
  memberIds: z.array(Cuid).min(1),
});
