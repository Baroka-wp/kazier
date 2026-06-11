/**
 * Fonctions métier Task + TaskAssignment + TaskComment.
 *
 * Émet :
 *   - "task.created"
 *   - "task.assigned"          (incluant les ré-assignations)
 *   - "task.status_changed"    (utile pour notifier review/done)
 *
 * Notes :
 *   - assigneeIds est l'ensemble cible des assignés. À chaque update on
 *     calcule le diff (added/removed) pour ne notifier que les nouveaux.
 *   - actualHours peut être set lors d'un passage à DONE.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ok, err, type Result } from "./result";
import { ERR } from "./errors";
import { validate } from "./validate";
import { requirePerm } from "./permissions";
import { logAction } from "./audit";
import { events } from "./events";
import { actorMemberId, type Actor } from "./actor";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksInput,
  ChangeTaskStatusInput,
  AssignTaskInput,
  TaskStatusEnum,
  PriorityEnum,
} from "./schemas/task";
import { Cuid, NonEmptyString } from "./schemas/common";
import { z } from "zod";

// ── Types de sortie ──────────────────────────────────────────────────────

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: z.infer<typeof TaskStatusEnum>;
  priority: z.infer<typeof PriorityEnum>;
  projectId: string | null;
  projectName: string | null;
  deliverableId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  assigneeIds: string[];
  assigneeNames: string[];
  createdAt: Date;
  updatedAt: Date;
};

type TaskWithRels = Prisma.TaskGetPayload<{
  include: {
    project: { select: { name: true } };
    assignments: { include: { member: { select: { firstName: true; lastName: true } } } };
  };
}>;

function toTaskRow(t: TaskWithRels): TaskRow {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
    deliverableId: t.deliverableId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
    actualHours: t.actualHours ? Number(t.actualHours) : null,
    assigneeIds: t.assignments.map((a) => a.memberId),
    assigneeNames: t.assignments.map((a) =>
      `${a.member.firstName} ${a.member.lastName}`.trim()
    ),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const includeTaskRels = {
  project: { select: { name: true } },
  assignments: { include: { member: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.TaskInclude;

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{ data: TaskRow[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const perm = requirePerm(actor, "tasks.read");
  if (!perm.ok) return perm;

  const v = validate(ListTasksInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, search, projectId, status, priority, assigneeId } = v.data;

  const where: Prisma.TaskWhereInput = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assignments = { some: { memberId: assigneeId } };

  try {
    const [total, rows] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: includeTaskRels,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toTaskRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.tasks.list]", e);
    return err(ERR.DB_ERROR, "Failed to list tasks");
  }
}

// ── Get ───────────────────────────────────────────────────────────────────

export async function get(actor: Actor, id: string): Promise<Result<TaskRow>> {
  const perm = requirePerm(actor, "tasks.read");
  if (!perm.ok) return perm;

  try {
    const t = await prisma.task.findUnique({ where: { id }, include: includeTaskRels });
    if (!t) return err(ERR.NOT_FOUND, `Task ${id} not found`);
    return ok(toTaskRow(t));
  } catch (e) {
    console.error("[core.tasks.get]", e);
    return err(ERR.DB_ERROR, "Failed to get task");
  }
}

// ── Create ────────────────────────────────────────────────────────────────

export async function create(actor: Actor, rawInput: unknown): Promise<Result<TaskRow>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  const v = validate(CreateTaskInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const created = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        deliverableId: data.deliverableId,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        assignments: { create: data.assigneeIds.map((memberId) => ({ memberId })) },
      },
      include: includeTaskRels,
    });

    await logAction({
      actor,
      action: "task.create",
      entity: "task",
      entityId: created.id,
      diff: {
        after: { title: created.title, status: created.status, assignees: data.assigneeIds },
      },
    });
    events.emit("task.created", {
      taskId: created.id,
      projectId: created.projectId,
      actorId: actorMemberId(actor),
    });
    if (data.assigneeIds.length > 0) {
      events.emit("task.assigned", {
        taskId: created.id,
        memberIds: data.assigneeIds,
        actorId: actorMemberId(actor),
      });
    }

    return ok(toTaskRow(created));
  } catch (e) {
    console.error("[core.tasks.create]", e);
    return err(ERR.DB_ERROR, "Failed to create task");
  }
}

// ── Update (générique) ────────────────────────────────────────────────────

export async function update(
  actor: Actor,
  id: string,
  rawInput: unknown
): Promise<Result<TaskRow>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  const v = validate(UpdateTaskInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignments: { select: { memberId: true } } },
    });
    if (!existing) return err(ERR.NOT_FOUND, `Task ${id} not found`);

    // Si assigneeIds est passé, on calcule le diff
    let addedAssignees: string[] = [];
    let removedAssignees: string[] = [];
    if (data.assigneeIds !== undefined) {
      const prev = new Set(existing.assignments.map((a) => a.memberId));
      const next = new Set(data.assigneeIds);
      addedAssignees = [...next].filter((id) => !prev.has(id));
      removedAssignees = [...prev].filter((id) => !next.has(id));
    }

    const fromStatus = existing.status;
    const toStatus = data.status;

    const updated = await prisma.$transaction(async (tx) => {
      // Update champs scalaires
      const u = await tx.task.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          projectId: data.projectId,
          deliverableId: data.deliverableId,
          status: data.status,
          priority: data.priority,
          startDate: data.startDate,
          dueDate: data.dueDate,
          estimatedHours: data.estimatedHours,
        },
      });
      // Re-sync assignments si fourni
      if (data.assigneeIds !== undefined) {
        if (removedAssignees.length > 0) {
          await tx.taskAssignment.deleteMany({
            where: { taskId: id, memberId: { in: removedAssignees } },
          });
        }
        if (addedAssignees.length > 0) {
          await tx.taskAssignment.createMany({
            data: addedAssignees.map((memberId) => ({ taskId: id, memberId })),
            skipDuplicates: true,
          });
        }
      }
      return u;
    });
    void updated;

    const refreshed = await prisma.task.findUnique({ where: { id }, include: includeTaskRels });
    if (!refreshed) return err(ERR.INTERNAL, "Task disappeared after update");

    await logAction({
      actor,
      action: "task.update",
      entity: "task",
      entityId: id,
      diff: {
        changes: Object.keys(data),
        ...(addedAssignees.length || removedAssignees.length
          ? { addedAssignees, removedAssignees }
          : {}),
        ...(toStatus && toStatus !== fromStatus ? { statusFrom: fromStatus, statusTo: toStatus } : {}),
      },
    });

    if (addedAssignees.length > 0) {
      events.emit("task.assigned", {
        taskId: id,
        memberIds: addedAssignees,
        actorId: actorMemberId(actor),
      });
    }
    if (toStatus && toStatus !== fromStatus) {
      events.emit("task.status_changed", {
        taskId: id,
        from: fromStatus,
        to: toStatus,
        actorId: actorMemberId(actor),
      });
    }

    return ok(toTaskRow(refreshed));
  } catch (e) {
    console.error("[core.tasks.update]", e);
    return err(ERR.DB_ERROR, "Failed to update task");
  }
}

// ── Change status (raccourci dédié) ──────────────────────────────────────

export async function changeStatus(
  actor: Actor,
  rawInput: unknown
): Promise<Result<TaskRow>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  const v = validate(ChangeTaskStatusInput, rawInput);
  if (!v.ok) return v;
  const { taskId, status, actualHours } = v.data;

  try {
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return err(ERR.NOT_FOUND, `Task ${taskId} not found`);

    if (existing.status === "CANCELLED" && status !== "CANCELLED") {
      return err(ERR.INVALID_STATE, "Cannot reactivate a cancelled task via changeStatus");
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status, actualHours: actualHours ?? existing.actualHours },
    });

    const refreshed = await prisma.task.findUnique({
      where: { id: taskId },
      include: includeTaskRels,
    });
    if (!refreshed) return err(ERR.INTERNAL, "Task disappeared");

    await logAction({
      actor,
      action: "task.status_changed",
      entity: "task",
      entityId: taskId,
      diff: { from: existing.status, to: status },
    });
    events.emit("task.status_changed", {
      taskId,
      from: existing.status,
      to: status,
      actorId: actorMemberId(actor),
    });
    return ok(toTaskRow(refreshed));
  } catch (e) {
    console.error("[core.tasks.changeStatus]", e);
    return err(ERR.DB_ERROR, "Failed to change task status");
  }
}

// ── Assign (replace set of assignees) ────────────────────────────────────

export async function assign(
  actor: Actor,
  rawInput: unknown
): Promise<Result<TaskRow>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  const v = validate(AssignTaskInput, rawInput);
  if (!v.ok) return v;
  const { taskId, memberIds } = v.data;

  try {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: { select: { memberId: true } } },
    });
    if (!existing) return err(ERR.NOT_FOUND, `Task ${taskId} not found`);

    const prev = new Set(existing.assignments.map((a) => a.memberId));
    const next = new Set(memberIds);
    const added = [...next].filter((id) => !prev.has(id));
    const removed = [...prev].filter((id) => !next.has(id));

    await prisma.$transaction(async (tx) => {
      if (removed.length > 0) {
        await tx.taskAssignment.deleteMany({
          where: { taskId, memberId: { in: removed } },
        });
      }
      if (added.length > 0) {
        await tx.taskAssignment.createMany({
          data: added.map((memberId) => ({ taskId, memberId })),
          skipDuplicates: true,
        });
      }
    });

    const refreshed = await prisma.task.findUnique({
      where: { id: taskId },
      include: includeTaskRels,
    });
    if (!refreshed) return err(ERR.INTERNAL, "Task disappeared");

    await logAction({
      actor,
      action: "task.assign",
      entity: "task",
      entityId: taskId,
      diff: { added, removed },
    });
    if (added.length > 0) {
      events.emit("task.assigned", { taskId, memberIds: added, actorId: actorMemberId(actor) });
    }
    return ok(toTaskRow(refreshed));
  } catch (e) {
    console.error("[core.tasks.assign]", e);
    return err(ERR.DB_ERROR, "Failed to assign task");
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Task ${id} not found`);

    await prisma.task.delete({ where: { id } });
    await logAction({
      actor,
      action: "task.delete",
      entity: "task",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.tasks.remove]", e);
    return err(ERR.DB_ERROR, "Failed to delete task");
  }
}

// ── Comments ──────────────────────────────────────────────────────────────

export const AddCommentInput = z.object({
  taskId: Cuid,
  content: NonEmptyString.max(5000),
});

export type TaskCommentRow = {
  id: string;
  taskId: string;
  memberId: string;
  authorName: string;
  content: string;
  createdAt: Date;
};

export async function addComment(
  actor: Actor,
  rawInput: unknown
): Promise<Result<TaskCommentRow>> {
  const perm = requirePerm(actor, "tasks.write");
  if (!perm.ok) return perm;

  const v = validate(AddCommentInput, rawInput);
  if (!v.ok) return v;
  const { taskId, content } = v.data;

  const authorId = actorMemberId(actor);
  if (!authorId) return err(ERR.UNAUTHENTICATED, "Cannot comment without a member identity");

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) return err(ERR.NOT_FOUND, `Task ${taskId} not found`);

    const created = await prisma.taskComment.create({
      data: { taskId, memberId: authorId, content },
      include: { member: { select: { firstName: true, lastName: true } } },
    });

    await logAction({
      actor,
      action: "task.comment",
      entity: "task",
      entityId: taskId,
      diff: { commentId: created.id },
    });

    return ok({
      id: created.id,
      taskId: created.taskId,
      memberId: created.memberId,
      authorName: `${created.member.firstName} ${created.member.lastName}`.trim(),
      content: created.content,
      createdAt: created.createdAt,
    });
  } catch (e) {
    console.error("[core.tasks.addComment]", e);
    return err(ERR.DB_ERROR, "Failed to add comment");
  }
}

export async function listComments(
  actor: Actor,
  taskId: string
): Promise<Result<TaskCommentRow[]>> {
  const perm = requirePerm(actor, "tasks.read");
  if (!perm.ok) return perm;

  try {
    const rows = await prisma.taskComment.findMany({
      where: { taskId },
      include: { member: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok(
      rows.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        memberId: c.memberId,
        authorName: `${c.member.firstName} ${c.member.lastName}`.trim(),
        content: c.content,
        createdAt: c.createdAt,
      }))
    );
  } catch (e) {
    console.error("[core.tasks.listComments]", e);
    return err(ERR.DB_ERROR, "Failed to list comments");
  }
}
