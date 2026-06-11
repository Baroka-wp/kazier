/**
 * Fonctions métier ProjectNote — mémoire textuelle par projet (Confluence light).
 *
 * Le body est du JSON TipTap. Pour la recherche, on s'appuie sur le title et
 * les tags (la recherche full-text dans le JSON sera ajoutée plus tard si
 * besoin — Postgres tsvector ou stockage d'un champ plain_text dérivé).
 *
 * Émet :
 *   - "note.created"
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
import { CreateNoteInput, UpdateNoteInput, ListNotesInput } from "./schemas/note";

// ── Types de sortie ──────────────────────────────────────────────────────

export type NoteRow = {
  id: string;
  projectId: string;
  title: string;
  body: unknown; // TipTap JSON
  tags: string[];
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toNoteRow(n: Prisma.ProjectNoteGetPayload<Record<string, never>>): NoteRow {
  return {
    id: n.id,
    projectId: n.projectId,
    title: n.title,
    body: n.body,
    tags: n.tags,
    pinned: n.pinned,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{ data: NoteRow[]; total: number; page: number; limit: number; totalPages: number }>
> {
  const perm = requirePerm(actor, "notes.read");
  if (!perm.ok) return perm;

  const v = validate(ListNotesInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, projectId, pinnedOnly, search, tag } = v.data;

  const where: Prisma.ProjectNoteWhereInput = { projectId };
  if (pinnedOnly) where.pinned = true;
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (tag) where.tags = { has: tag };

  try {
    const [total, rows] = await Promise.all([
      prisma.projectNote.count({ where }),
      prisma.projectNote.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toNoteRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.notes.list]", e);
    return err(ERR.DB_ERROR, "Failed to list notes");
  }
}

// ── Get ───────────────────────────────────────────────────────────────────

export async function get(actor: Actor, id: string): Promise<Result<NoteRow>> {
  const perm = requirePerm(actor, "notes.read");
  if (!perm.ok) return perm;

  try {
    const n = await prisma.projectNote.findUnique({ where: { id } });
    if (!n) return err(ERR.NOT_FOUND, `Note ${id} not found`);
    return ok(toNoteRow(n));
  } catch (e) {
    console.error("[core.notes.get]", e);
    return err(ERR.DB_ERROR, "Failed to get note");
  }
}

// ── Create ────────────────────────────────────────────────────────────────

export async function create(actor: Actor, rawInput: unknown): Promise<Result<NoteRow>> {
  const perm = requirePerm(actor, "notes.write");
  if (!perm.ok) return perm;

  const v = validate(CreateNoteInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true },
    });
    if (!project) return err(ERR.NOT_FOUND, `Project ${data.projectId} not found`);

    const created = await prisma.projectNote.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        body: data.body as Prisma.InputJsonValue,
        tags: data.tags,
        pinned: data.pinned,
      },
    });

    await logAction({
      actor,
      action: "note.create",
      entity: "note",
      entityId: created.id,
      diff: { projectId: data.projectId, title: data.title, tags: data.tags },
    });
    events.emit("note.created", {
      noteId: created.id,
      projectId: data.projectId,
      actorId: actorMemberId(actor),
    });

    return ok(toNoteRow(created));
  } catch (e) {
    console.error("[core.notes.create]", e);
    return err(ERR.DB_ERROR, "Failed to create note");
  }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function update(
  actor: Actor,
  id: string,
  rawInput: unknown
): Promise<Result<NoteRow>> {
  const perm = requirePerm(actor, "notes.write");
  if (!perm.ok) return perm;

  const v = validate(UpdateNoteInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  try {
    const existing = await prisma.projectNote.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Note ${id} not found`);

    const updated = await prisma.projectNote.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body !== undefined ? (data.body as Prisma.InputJsonValue) : undefined,
        tags: data.tags,
        pinned: data.pinned,
      },
    });

    await logAction({
      actor,
      action: "note.update",
      entity: "note",
      entityId: id,
      diff: { changes: Object.keys(data) },
    });
    return ok(toNoteRow(updated));
  } catch (e) {
    console.error("[core.notes.update]", e);
    return err(ERR.DB_ERROR, "Failed to update note");
  }
}

// ── Remove ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "notes.write");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.projectNote.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Note ${id} not found`);

    await prisma.projectNote.delete({ where: { id } });
    await logAction({
      actor,
      action: "note.delete",
      entity: "note",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.notes.remove]", e);
    return err(ERR.DB_ERROR, "Failed to delete note");
  }
}
