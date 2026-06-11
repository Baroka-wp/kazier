/**
 * Fonctions métier Project + ProjectMember.
 *
 * Émet :
 *   - "project.created"
 *   - "project.member_added"
 *   - "project.member_removed"
 *
 * Note finance : budgetAmount / contractValue ne sont retournés qu'aux actors
 * ayant `projects.finance`. Pour les autres, ces champs sont mis à null dans
 * l'output.
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
import {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
  AddProjectMemberInput,
  ProjectStatusEnum,
} from "./schemas/project";
import { Cuid } from "./schemas/common";
import { z } from "zod";

// ── Types de sortie ──────────────────────────────────────────────────────

export type ProjectMemberRow = {
  memberId: string;
  fullName: string;
  roleLabel: string | null;
  joinedAt: Date;
};

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: z.infer<typeof ProjectStatusEnum>;
  startDate: Date | null;
  endDate: Date | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  contractValue: number | null;
  objectives: string | null;
  stakeholders: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  taskCount: number;
};

export type ProjectDetail = ProjectRow & {
  members: ProjectMemberRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────

type ProjectWithCounts = Prisma.ProjectGetPayload<{
  include: { _count: { select: { members: true; tasks: true } } };
}>;

function toProjectRow(p: ProjectWithCounts, actor: Actor): ProjectRow {
  const canFinance = hasPerm(actor, "projects.finance");
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate,
    budgetAmount: canFinance && p.budgetAmount ? Number(p.budgetAmount) : null,
    budgetCurrency: p.budgetCurrency,
    contractValue: canFinance && p.contractValue ? Number(p.contractValue) : null,
    objectives: p.objectives,
    stakeholders: p.stakeholders,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    memberCount: p._count.members,
    taskCount: p._count.tasks,
  };
}

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{ data: ProjectRow[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const perm = requirePerm(actor, "projects.read");
  if (!perm.ok) return perm;

  const v = validate(ListProjectsInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, search, status, memberId } = v.data;

  const where: Prisma.ProjectWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (memberId) where.members = { some: { memberId } };

  try {
    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: { _count: { select: { members: true, tasks: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map((p) => toProjectRow(p, actor)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.projects.list]", e);
    return err(ERR.DB_ERROR, "Failed to list projects");
  }
}

// ── Get (detail with members) ────────────────────────────────────────────

export async function get(actor: Actor, id: string): Promise<Result<ProjectDetail>> {
  const perm = requirePerm(actor, "projects.read");
  if (!perm.ok) return perm;

  try {
    const p = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, tasks: true } },
        members: {
          include: { member: { select: { firstName: true, lastName: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    if (!p) return err(ERR.NOT_FOUND, `Project ${id} not found`);

    const row = toProjectRow(p, actor);
    return ok({
      ...row,
      members: p.members.map((m) => ({
        memberId: m.memberId,
        fullName: `${m.member.firstName} ${m.member.lastName}`.trim(),
        roleLabel: m.roleLabel,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (e) {
    console.error("[core.projects.get]", e);
    return err(ERR.DB_ERROR, "Failed to get project");
  }
}

// ── Create ────────────────────────────────────────────────────────────────

export async function create(actor: Actor, rawInput: unknown): Promise<Result<ProjectDetail>> {
  const perm = requirePerm(actor, "projects.write");
  if (!perm.ok) return perm;

  const v = validate(CreateProjectInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const created = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        budgetAmount: data.budgetAmount,
        budgetCurrency: data.budgetCurrency,
        contractValue: data.contractValue,
        objectives: data.objectives,
        stakeholders: data.stakeholders,
        members: {
          create: data.memberIds.map((memberId) => ({ memberId })),
        },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
        members: {
          include: { member: { select: { firstName: true, lastName: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    await logAction({
      actor,
      action: "project.create",
      entity: "project",
      entityId: created.id,
      diff: { after: { name: created.name, memberIds: data.memberIds } },
    });

    events.emit("project.created", {
      projectId: created.id,
      actorId: actorMemberId(actor),
    });
    for (const memberId of data.memberIds) {
      events.emit("project.member_added", {
        projectId: created.id,
        memberId,
        actorId: actorMemberId(actor),
      });
    }

    const row = toProjectRow(created, actor);
    return ok({
      ...row,
      members: created.members.map((m) => ({
        memberId: m.memberId,
        fullName: `${m.member.firstName} ${m.member.lastName}`.trim(),
        roleLabel: m.roleLabel,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (e) {
    console.error("[core.projects.create]", e);
    return err(ERR.DB_ERROR, "Failed to create project");
  }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function update(
  actor: Actor,
  id: string,
  rawInput: unknown
): Promise<Result<ProjectRow>> {
  const perm = requirePerm(actor, "projects.write");
  if (!perm.ok) return perm;

  const v = validate(UpdateProjectInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  // Si on touche au budget, on exige projects.finance
  if (
    (data.budgetAmount !== undefined || data.contractValue !== undefined) &&
    !hasPerm(actor, "projects.finance")
  ) {
    return err(ERR.FORBIDDEN, "Permission denied: projects.finance");
  }

  try {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Project ${id} not found`);

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: { _count: { select: { members: true, tasks: true } } },
    });

    await logAction({
      actor,
      action: "project.update",
      entity: "project",
      entityId: id,
      diff: { changes: Object.keys(data) },
    });

    return ok(toProjectRow(updated, actor));
  } catch (e) {
    console.error("[core.projects.update]", e);
    return err(ERR.DB_ERROR, "Failed to update project");
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "projects.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Project ${id} not found`);

    await prisma.project.delete({ where: { id } });
    await logAction({
      actor,
      action: "project.delete",
      entity: "project",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.projects.delete]", e);
    return err(ERR.DB_ERROR, "Failed to delete project");
  }
}

// ── Membership management ────────────────────────────────────────────────

export async function addMember(
  actor: Actor,
  rawInput: unknown
): Promise<Result<{ projectId: string; memberId: string }>> {
  const perm = requirePerm(actor, "projects.write");
  if (!perm.ok) return perm;

  const v = validate(AddProjectMemberInput, rawInput);
  if (!v.ok) return v;
  const { projectId, memberId, roleLabel } = v.data;

  try {
    const [project, member] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.member.findUnique({ where: { id: memberId } }),
    ]);
    if (!project) return err(ERR.NOT_FOUND, `Project ${projectId} not found`);
    if (!member) return err(ERR.NOT_FOUND, `Member ${memberId} not found`);

    await prisma.projectMember.upsert({
      where: { projectId_memberId: { projectId, memberId } },
      create: { projectId, memberId, roleLabel },
      update: { roleLabel },
    });

    await logAction({
      actor,
      action: "project.member_added",
      entity: "project",
      entityId: projectId,
      diff: { memberId, roleLabel },
    });
    events.emit("project.member_added", { projectId, memberId, actorId: actorMemberId(actor) });

    return ok({ projectId, memberId });
  } catch (e) {
    console.error("[core.projects.addMember]", e);
    return err(ERR.DB_ERROR, "Failed to add member");
  }
}

export const RemoveMemberInput = z.object({ projectId: Cuid, memberId: Cuid });

export async function removeMember(
  actor: Actor,
  rawInput: unknown
): Promise<Result<{ projectId: string; memberId: string }>> {
  const perm = requirePerm(actor, "projects.write");
  if (!perm.ok) return perm;

  const v = validate(RemoveMemberInput, rawInput);
  if (!v.ok) return v;
  const { projectId, memberId } = v.data;

  try {
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_memberId: { projectId, memberId } },
    });
    if (!existing) return err(ERR.NOT_FOUND, "Member not on this project");

    await prisma.projectMember.delete({
      where: { projectId_memberId: { projectId, memberId } },
    });

    await logAction({
      actor,
      action: "project.member_removed",
      entity: "project",
      entityId: projectId,
      diff: { memberId },
    });
    events.emit("project.member_removed", { projectId, memberId, actorId: actorMemberId(actor) });

    return ok({ projectId, memberId });
  } catch (e) {
    console.error("[core.projects.removeMember]", e);
    return err(ERR.DB_ERROR, "Failed to remove member");
  }
}
