/**
 * Fonctions métier Member. Pures (zéro Next, zéro Slack, zéro auth() implicite).
 *
 * Consommé par :
 *   - lib/equipe-actions.ts (Server Actions UI)
 *   - lib/server/mcp/* (tools MCP)
 *   - cron workers
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ok, err, type Result } from "./result";
import { ERR } from "./errors";
import { validate } from "./validate";
import { requirePerm } from "./permissions";
import { logAction } from "./audit";
import type { Actor } from "./actor";
import { Pagination } from "./schemas/common";
import { z } from "zod";
import {
  CreateMemberInput,
  UpdateMemberInput,
  RoleEnum,
} from "./schemas/member";

// ── Types de sortie ──────────────────────────────────────────────────────

export type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  slackId: string | null;
  role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER";
  isBoss: boolean;
  isActive: boolean;
  hasAuth: boolean;
  createdAt: Date;
};

export type ListMembersInput = z.infer<typeof ListMembersInputSchema>;

export const ListMembersInputSchema = Pagination.extend({
  search: z.string().trim().optional(),
  role: RoleEnum.optional(),
  isBoss: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────

function toMemberRow(m: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  slackId: string | null;
  role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER";
  isBoss: boolean;
  isActive: boolean;
  createdAt: Date;
  auth: { id: string } | null;
}): MemberRow {
  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    fullName: `${m.firstName} ${m.lastName}`.trim(),
    email: m.email,
    phone: m.phone,
    age: m.age,
    slackId: m.slackId,
    role: m.role,
    isBoss: m.isBoss,
    isActive: m.isActive,
    hasAuth: m.auth !== null,
    createdAt: m.createdAt,
  };
}

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{ data: MemberRow[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const perm = requirePerm(actor, "members.read");
  if (!perm.ok) return perm;

  const v = validate(ListMembersInputSchema, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, search, role, isBoss, isActive } = v.data;

  const where: Prisma.MemberWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (typeof isBoss === "boolean") where.isBoss = isBoss;
  if (typeof isActive === "boolean") where.isActive = isActive;

  try {
    const [total, rows] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        include: { auth: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toMemberRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.members.list]", e);
    return err(ERR.DB_ERROR, "Failed to list members");
  }
}

// ── Get ───────────────────────────────────────────────────────────────────

export async function get(actor: Actor, id: string): Promise<Result<MemberRow>> {
  const perm = requirePerm(actor, "members.read");
  if (!perm.ok) return perm;

  try {
    const m = await prisma.member.findUnique({
      where: { id },
      include: { auth: { select: { id: true } } },
    });
    if (!m) return err(ERR.NOT_FOUND, `Member ${id} not found`);
    return ok(toMemberRow(m));
  } catch (e) {
    console.error("[core.members.get]", e);
    return err(ERR.DB_ERROR, "Failed to get member");
  }
}

// ── Create ────────────────────────────────────────────────────────────────

export async function create(actor: Actor, rawInput: unknown): Promise<Result<MemberRow>> {
  const perm = requirePerm(actor, "members.write");
  if (!perm.ok) return perm;

  const v = validate(CreateMemberInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    if (data.email) {
      const existing = await prisma.member.findUnique({ where: { email: data.email } });
      if (existing) return err(ERR.CONFLICT, `Email ${data.email} already in use`);
    }

    const created = await prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        age: data.age,
        slackId: data.slackId,
        role: data.role,
        isBoss: data.isBoss,
      },
      include: { auth: { select: { id: true } } },
    });

    await logAction({
      actor,
      action: "member.create",
      entity: "member",
      entityId: created.id,
      diff: { after: { firstName: created.firstName, lastName: created.lastName, role: created.role } },
    });

    return ok(toMemberRow(created));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(ERR.CONFLICT, "Unique constraint violation");
    }
    console.error("[core.members.create]", e);
    return err(ERR.DB_ERROR, "Failed to create member");
  }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function update(
  actor: Actor,
  id: string,
  rawInput: unknown
): Promise<Result<MemberRow>> {
  const perm = requirePerm(actor, "members.write");
  if (!perm.ok) return perm;

  const v = validate(UpdateMemberInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Member ${id} not found`);

    const updated = await prisma.member.update({
      where: { id },
      data,
      include: { auth: { select: { id: true } } },
    });

    const changes = Object.keys(data);
    await logAction({
      actor,
      action: "member.update",
      entity: "member",
      entityId: id,
      diff: { changes },
    });

    return ok(toMemberRow(updated));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(ERR.CONFLICT, "Unique constraint violation");
    }
    console.error("[core.members.update]", e);
    return err(ERR.DB_ERROR, "Failed to update member");
  }
}

// ── Deactivate (soft delete) ──────────────────────────────────────────────

export async function deactivate(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "members.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Member ${id} not found`);
    if (!existing.isActive) return ok({ id });

    await prisma.member.update({ where: { id }, data: { isActive: false } });
    await logAction({
      actor,
      action: "member.deactivate",
      entity: "member",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.members.deactivate]", e);
    return err(ERR.DB_ERROR, "Failed to deactivate member");
  }
}

// ── Search (autocomplete) ────────────────────────────────────────────────

export async function search(
  actor: Actor,
  query: string,
  limit = 5
): Promise<Result<Array<{ id: string; fullName: string }>>> {
  const perm = requirePerm(actor, "members.read");
  if (!perm.ok) return perm;

  if (!query || query.trim().length < 2) return ok([]);

  try {
    const rows = await prisma.member.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
      take: limit,
    });
    return ok(
      rows.map((r) => ({ id: r.id, fullName: `${r.firstName} ${r.lastName}`.trim() }))
    );
  } catch (e) {
    console.error("[core.members.search]", e);
    return err(ERR.DB_ERROR, "Failed to search members");
  }
}

