/**
 * Fonctions métier Deliverable.
 *
 * Hiérarchie : parent (cadence=MONTHLY) → children (cadence=WEEKLY) → tasks.
 * Permet d'agréger l'avancement depuis les tasks vers les livrables parents.
 *
 * Émet :
 *   - "deliverable.created"
 *   - "deliverable.status_changed"  (DONE / MISSED notamment)
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
  CreateDeliverableInput,
  UpdateDeliverableInput,
  ListDeliverablesInput,
  CadenceEnum,
  DeliverableStatusEnum,
} from "./schemas/deliverable";
import { Cuid } from "./schemas/common";
import { z } from "zod";

// ── Types de sortie ──────────────────────────────────────────────────────

export type DeliverableRow = {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  cadence: z.infer<typeof CadenceEnum>;
  dueDate: Date;
  status: z.infer<typeof DeliverableStatusEnum>;
  completedAt: Date | null;
  taskCount: number;
  doneTaskCount: number;
  completion: number; // 0..1, dérivé des tâches enfants
  createdAt: Date;
};

type DeliverableWithCounts = Prisma.DeliverableGetPayload<{
  include: {
    _count: { select: { tasks: true; children: true } };
    tasks: { select: { status: true } };
  };
}>;

function toDeliverableRow(d: DeliverableWithCounts): DeliverableRow {
  const total = d.tasks.length;
  const done = d.tasks.filter((t) => t.status === "DONE").length;
  return {
    id: d.id,
    projectId: d.projectId,
    parentId: d.parentId,
    title: d.title,
    description: d.description,
    cadence: d.cadence,
    dueDate: d.dueDate,
    status: d.status,
    completedAt: d.completedAt,
    taskCount: total,
    doneTaskCount: done,
    completion: total === 0 ? 0 : done / total,
    createdAt: d.createdAt,
  };
}

const includeDeliverableRels = {
  _count: { select: { tasks: true, children: true } },
  tasks: { select: { status: true } },
} satisfies Prisma.DeliverableInclude;

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{
    data: DeliverableRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>
> {
  const perm = requirePerm(actor, "deliverables.read");
  if (!perm.ok) return perm;

  const v = validate(ListDeliverablesInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, projectId, cadence, status, dueBefore, dueAfter } = v.data;

  const where: Prisma.DeliverableWhereInput = {};
  if (projectId) where.projectId = projectId;
  if (cadence) where.cadence = cadence;
  if (status) where.status = status;
  if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueAfter) where.dueDate.gte = dueAfter;
    if (dueBefore) where.dueDate.lte = dueBefore;
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.deliverable.count({ where }),
      prisma.deliverable.findMany({
        where,
        include: includeDeliverableRels,
        orderBy: { dueDate: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toDeliverableRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.deliverables.list]", e);
    return err(ERR.DB_ERROR, "Failed to list deliverables");
  }
}

// ── Get ───────────────────────────────────────────────────────────────────

export async function get(actor: Actor, id: string): Promise<Result<DeliverableRow>> {
  const perm = requirePerm(actor, "deliverables.read");
  if (!perm.ok) return perm;
  try {
    const d = await prisma.deliverable.findUnique({
      where: { id },
      include: includeDeliverableRels,
    });
    if (!d) return err(ERR.NOT_FOUND, `Deliverable ${id} not found`);
    return ok(toDeliverableRow(d));
  } catch (e) {
    console.error("[core.deliverables.get]", e);
    return err(ERR.DB_ERROR, "Failed to get deliverable");
  }
}

// ── Create ────────────────────────────────────────────────────────────────

export async function create(actor: Actor, rawInput: unknown): Promise<Result<DeliverableRow>> {
  const perm = requirePerm(actor, "deliverables.write");
  if (!perm.ok) return perm;

  const v = validate(CreateDeliverableInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    // Sanity : projectId + parentId cohérents (parent doit être dans le même projet)
    if (data.parentId) {
      const parent = await prisma.deliverable.findUnique({
        where: { id: data.parentId },
        select: { projectId: true },
      });
      if (!parent) return err(ERR.NOT_FOUND, "Parent deliverable not found");
      if (parent.projectId !== data.projectId) {
        return err(ERR.INVALID_STATE, "Parent deliverable belongs to a different project");
      }
    }

    const created = await prisma.deliverable.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId,
        title: data.title,
        description: data.description,
        cadence: data.cadence,
        dueDate: data.dueDate,
        status: data.status,
      },
      include: includeDeliverableRels,
    });

    await logAction({
      actor,
      action: "deliverable.create",
      entity: "deliverable",
      entityId: created.id,
      diff: { after: { title: created.title, cadence: created.cadence, dueDate: created.dueDate } },
    });
    events.emit("deliverable.created", {
      deliverableId: created.id,
      projectId: created.projectId,
      actorId: actorMemberId(actor),
    });

    return ok(toDeliverableRow(created));
  } catch (e) {
    console.error("[core.deliverables.create]", e);
    return err(ERR.DB_ERROR, "Failed to create deliverable");
  }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function update(
  actor: Actor,
  id: string,
  rawInput: unknown
): Promise<Result<DeliverableRow>> {
  const perm = requirePerm(actor, "deliverables.write");
  if (!perm.ok) return perm;

  const v = validate(UpdateDeliverableInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const existing = await prisma.deliverable.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Deliverable ${id} not found`);

    const fromStatus = existing.status;
    const toStatus = data.status;

    // completedAt auto si on passe à DONE
    const completedAtUpdate =
      toStatus === "DONE" && fromStatus !== "DONE"
        ? { completedAt: new Date() }
        : toStatus && toStatus !== "DONE" && fromStatus === "DONE"
          ? { completedAt: null }
          : {};

    const updated = await prisma.deliverable.update({
      where: { id },
      data: { ...data, ...completedAtUpdate },
      include: includeDeliverableRels,
    });

    await logAction({
      actor,
      action: "deliverable.update",
      entity: "deliverable",
      entityId: id,
      diff: {
        changes: Object.keys(data),
        ...(toStatus && toStatus !== fromStatus
          ? { statusFrom: fromStatus, statusTo: toStatus }
          : {}),
      },
    });
    if (toStatus && toStatus !== fromStatus) {
      events.emit("deliverable.status_changed", {
        deliverableId: id,
        from: fromStatus,
        to: toStatus,
        actorId: actorMemberId(actor),
      });
    }

    return ok(toDeliverableRow(updated));
  } catch (e) {
    console.error("[core.deliverables.update]", e);
    return err(ERR.DB_ERROR, "Failed to update deliverable");
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "deliverables.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.deliverable.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!existing) return err(ERR.NOT_FOUND, `Deliverable ${id} not found`);
    if (existing._count.children > 0) {
      return err(
        ERR.INVALID_STATE,
        "Cannot delete deliverable with children — delete children first"
      );
    }

    await prisma.deliverable.delete({ where: { id } });
    await logAction({
      actor,
      action: "deliverable.delete",
      entity: "deliverable",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.deliverables.remove]", e);
    return err(ERR.DB_ERROR, "Failed to delete deliverable");
  }
}

// ── Tree (project hierarchy view) ────────────────────────────────────────

export const GetTreeInput = z.object({ projectId: Cuid });

export type DeliverableNode = DeliverableRow & { children: DeliverableNode[] };

export async function tree(actor: Actor, rawInput: unknown): Promise<Result<DeliverableNode[]>> {
  const perm = requirePerm(actor, "deliverables.read");
  if (!perm.ok) return perm;

  const v = validate(GetTreeInput, rawInput);
  if (!v.ok) return v;
  const { projectId } = v.data;

  try {
    const rows = await prisma.deliverable.findMany({
      where: { projectId },
      include: includeDeliverableRels,
      orderBy: { dueDate: "asc" },
    });

    const byId = new Map<string, DeliverableNode>();
    for (const r of rows) byId.set(r.id, { ...toDeliverableRow(r), children: [] });

    const roots: DeliverableNode[] = [];
    for (const r of rows) {
      const node = byId.get(r.id)!;
      if (r.parentId && byId.has(r.parentId)) {
        byId.get(r.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return ok(roots);
  } catch (e) {
    console.error("[core.deliverables.tree]", e);
    return err(ERR.DB_ERROR, "Failed to build deliverable tree");
  }
}
