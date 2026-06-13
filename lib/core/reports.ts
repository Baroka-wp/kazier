/**
 * Fonctions métier Report (rapport journalier).
 *
 * Particularités :
 *   - submit() doit gérer le cas double-submit (contrainte @@unique
 *     [memberId, reportDate, projectId]) : on retourne CONFLICT proprement
 *     plutôt que de propager l'erreur Prisma.
 *   - hasSubmittedToday() : helper pour le DailyForm.
 *   - missingMembers() : qui n'a pas soumis aujourd'hui — utilisé par les crons.
 *   - weeklySummary() : agrégat par projet/semaine pour le pilotage IA.
 *
 * Émet :
 *   - "report.submitted"
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ok, err, type Result } from "./result";
import { ERR } from "./errors";
import { validate } from "./validate";
import { hasPerm, requirePerm } from "./permissions";
import { logAction } from "./audit";
import { events } from "./events";
import { actorMemberId, type Actor } from "./actor";
import { SubmitReportInput, ListReportsInput } from "./schemas/report";
import { Cuid, DateOnly } from "./schemas/common";
import { z } from "zod";

// ── Types de sortie ──────────────────────────────────────────────────────

export type ReportRow = {
  id: string;
  memberId: string;
  memberName: string;
  projectId: string | null;
  projectName: string | null;
  reportDate: Date;
  workCompleted: string | null;
  inProgress: string | null;
  blockers: string | null;
  learnings: string | null;
  learningNeeded: string | null;
  tomorrowPlan: string | null;
  extraMessage: string | null;
  createdAt: Date;
};

type ReportWithRels = Prisma.ReportGetPayload<{
  include: {
    member: { select: { firstName: true; lastName: true } };
    project: { select: { name: true } };
  };
}>;

function toReportRow(r: ReportWithRels): ReportRow {
  return {
    id: r.id,
    memberId: r.memberId,
    memberName: `${r.member.firstName} ${r.member.lastName}`.trim(),
    projectId: r.projectId,
    projectName: r.project?.name ?? null,
    reportDate: r.reportDate,
    workCompleted: r.workCompleted,
    inProgress: r.inProgress,
    blockers: r.blockers,
    learnings: r.learnings,
    learningNeeded: r.learningNeeded,
    tomorrowPlan: r.tomorrowPlan,
    extraMessage: r.extraMessage,
    createdAt: r.createdAt,
  };
}

const includeReportRels = {
  member: { select: { firstName: true, lastName: true } },
  project: { select: { name: true } },
} satisfies Prisma.ReportInclude;

// ── Submit ───────────────────────────────────────────────────────────────
// Réf : la contrainte @@unique([memberId, reportDate, projectId]) garantit
// l'anti-doublon. Si l'INSERT viole la contrainte (P2002), on retourne
// CONFLICT pour que le client puisse afficher "déjà soumis aujourd'hui".

export async function submit(actor: Actor, rawInput: unknown): Promise<Result<ReportRow>> {
  const perm = requirePerm(actor, "reports.write");
  if (!perm.ok) return perm;

  const v = validate(SubmitReportInput, rawInput);
  if (!v.ok) return v;
  const data = v.data;

  // Sécurité : un MEMBER ne peut soumettre QUE pour lui-même.
  if (actor.type === "HUMAN" && actor.role === "MEMBER" && actor.memberId !== data.memberId) {
    return err(ERR.FORBIDDEN, "MEMBER can only submit their own report");
  }

  // reportDate par défaut = today UTC (Date à 00:00 UTC)
  const reportDate =
    data.reportDate ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  try {
    const created = await prisma.report.create({
      data: {
        memberId: data.memberId,
        projectId: data.projectId,
        reportDate,
        workCompleted: data.workCompleted,
        inProgress: data.inProgress,
        blockers: data.blockers,
        learnings: data.learnings,
        learningNeeded: data.learningNeeded,
        tomorrowPlan: data.tomorrowPlan,
        extraMessage: data.extraMessage,
      },
      include: includeReportRels,
    });

    await logAction({
      actor,
      action: "report.submit",
      entity: "report",
      entityId: created.id,
      diff: { memberId: data.memberId, projectId: data.projectId },
    });
    events.emit("report.submitted", {
      reportId: created.id,
      memberId: data.memberId,
      projectId: data.projectId ?? null,
    });

    return ok(toReportRow(created));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(ERR.CONFLICT, "Report already submitted for this member/date/project today");
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2003" || e.code === "P2025")
    ) {
      return err(ERR.NOT_FOUND, "Member or project does not exist");
    }
    console.error("[core.reports.submit]", e);
    return err(ERR.DB_ERROR, "Failed to submit report");
  }
}

// ── List ──────────────────────────────────────────────────────────────────

export async function list(
  actor: Actor,
  rawInput: unknown
): Promise<
  Result<{
    data: ReportRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>
> {
  const perm = requirePerm(actor, "reports.read");
  if (!perm.ok) return perm;

  const v = validate(ListReportsInput, rawInput ?? {});
  if (!v.ok) return v;
  const { page, limit, memberId, projectId, from, to, search } = v.data;

  const where: Prisma.ReportWhereInput = {};
  if (memberId) where.memberId = memberId;
  if (projectId) where.projectId = projectId;
  if (from || to) {
    where.reportDate = {};
    if (from) where.reportDate.gte = from;
    if (to) where.reportDate.lte = to;
  }
  if (search) {
    where.OR = [
      { workCompleted: { contains: search, mode: "insensitive" } },
      { blockers: { contains: search, mode: "insensitive" } },
      { tomorrowPlan: { contains: search, mode: "insensitive" } },
      { extraMessage: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: includeReportRels,
        orderBy: { reportDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return ok({
      data: rows.map(toReportRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("[core.reports.list]", e);
    return err(ERR.DB_ERROR, "Failed to list reports");
  }
}

// ── Has submitted today ───────────────────────────────────────────────────

export const HasSubmittedInput = z.object({
  memberId: Cuid,
  date: DateOnly.optional(),
});

export async function hasSubmittedOn(
  actor: Actor,
  rawInput: unknown
): Promise<Result<{ submitted: boolean; count: number }>> {
  // Lecture autorisée à tout actor authentifié — pas de gate `reports.read`
  // car le DailyForm est public côté membre (un user vérifie SON statut).
  // On bloque juste si actor humain qui n'est pas le membre concerné et pas SA/PM.
  const v = validate(HasSubmittedInput, rawInput);
  if (!v.ok) return v;
  const { memberId, date } = v.data;

  if (actor.type === "HUMAN" && actor.role === "MEMBER" && actor.memberId !== memberId) {
    return err(ERR.FORBIDDEN, "Cannot check another member's status");
  }

  const target = date ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  try {
    const count = await prisma.report.count({
      where: { memberId, reportDate: target },
    });
    return ok({ submitted: count > 0, count });
  } catch (e) {
    console.error("[core.reports.hasSubmittedOn]", e);
    return err(ERR.DB_ERROR, "Failed to check submission");
  }
}

// ── Missing members for a given date ────────────────────────────────────

export const MissingMembersInput = z.object({
  date: DateOnly.optional(),
  excludeBoss: z.boolean().default(true),
  excludeInactive: z.boolean().default(true),
});

export type MissingMember = {
  id: string;
  fullName: string;
  slackId: string | null;
};

export async function missingMembers(
  actor: Actor,
  rawInput: unknown
): Promise<Result<MissingMember[]>> {
  // Utilisé par cron (SYSTEM) et dashboard (SA/PM). On exige reports.read.
  const perm = requirePerm(actor, "reports.read");
  if (!perm.ok) return perm;

  const v = validate(MissingMembersInput, rawInput ?? {});
  if (!v.ok) return v;
  const { date, excludeBoss, excludeInactive } = v.data;

  const target = date ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  try {
    const memberWhere: Prisma.MemberWhereInput = {};
    if (excludeBoss) memberWhere.isBoss = false;
    if (excludeInactive) memberWhere.isActive = true;

    const [members, submittedToday] = await Promise.all([
      prisma.member.findMany({
        where: memberWhere,
        select: { id: true, firstName: true, lastName: true, slackId: true },
        orderBy: { firstName: "asc" },
      }),
      prisma.report.findMany({
        where: { reportDate: target },
        select: { memberId: true },
        distinct: ["memberId"],
      }),
    ]);

    const submittedIds = new Set(submittedToday.map((r) => r.memberId));
    return ok(
      members
        .filter((m) => !submittedIds.has(m.id))
        .map((m) => ({
          id: m.id,
          fullName: `${m.firstName} ${m.lastName}`.trim(),
          slackId: m.slackId,
        }))
    );
  } catch (e) {
    console.error("[core.reports.missingMembers]", e);
    return err(ERR.DB_ERROR, "Failed to list missing members");
  }
}

// ── Weekly summary by project ────────────────────────────────────────────
//
// Agrégat des rapports d'une semaine donnée, regroupés par projet.
// Permet à un PM/SA (ou Claude via MCP) de voir d'un coup :
//   - combien de rapports par projet
//   - les principaux contributeurs
//   - les blocages remontés (en raw text, pour LLM)
//
// "weekOf" est une date dans la semaine ciblée — on calcule lundi → dimanche UTC.

export const WeeklySummaryInput = z.object({
  weekOf: DateOnly.optional(),
  projectId: Cuid.optional(),
});

export type WeeklySummaryPerProject = {
  projectId: string | null;
  projectName: string;
  reportCount: number;
  contributors: Array<{ memberId: string; name: string; count: number }>;
  blockers: string[];
  tomorrowPlans: string[];
};

export type WeeklySummary = {
  weekStart: Date;
  weekEnd: Date;
  totals: { reportCount: number; activeMemberCount: number };
  perProject: WeeklySummaryPerProject[];
};

export async function weeklySummary(
  actor: Actor,
  rawInput: unknown
): Promise<Result<WeeklySummary>> {
  const perm = requirePerm(actor, "reports.read");
  if (!perm.ok) return perm;

  const v = validate(WeeklySummaryInput, rawInput ?? {});
  if (!v.ok) return v;
  const { weekOf, projectId } = v.data;

  const ref = weekOf ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const day = ref.getUTCDay(); // 0 dim, 1 lun, …
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(ref);
  weekStart.setUTCDate(ref.getUTCDate() + offsetToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  try {
    const where: Prisma.ReportWhereInput = {
      reportDate: { gte: weekStart, lt: weekEnd },
    };
    if (projectId) where.projectId = projectId;

    const reports = await prisma.report.findMany({
      where,
      include: includeReportRels,
      orderBy: [{ projectId: "asc" }, { reportDate: "asc" }],
    });

    const grouped = new Map<string, ReportWithRels[]>();
    for (const r of reports) {
      const k = r.projectId ?? "__none__";
      const arr = grouped.get(k) ?? [];
      arr.push(r);
      grouped.set(k, arr);
    }

    const perProject: WeeklySummaryPerProject[] = [];
    for (const [k, rs] of grouped) {
      const contribMap = new Map<string, { name: string; count: number }>();
      const blockers: string[] = [];
      const tomorrow: string[] = [];
      for (const r of rs) {
        const memName = `${r.member.firstName} ${r.member.lastName}`.trim();
        const c = contribMap.get(r.memberId) ?? { name: memName, count: 0 };
        c.count++;
        contribMap.set(r.memberId, c);
        if (r.blockers) blockers.push(r.blockers);
        if (r.tomorrowPlan) tomorrow.push(r.tomorrowPlan);
      }
      perProject.push({
        projectId: k === "__none__" ? null : k,
        projectName: rs[0].project?.name ?? "Sans projet",
        reportCount: rs.length,
        contributors: [...contribMap.entries()].map(([memberId, v]) => ({
          memberId,
          name: v.name,
          count: v.count,
        })),
        blockers,
        tomorrowPlans: tomorrow,
      });
    }

    const activeMembers = new Set(reports.map((r) => r.memberId));
    return ok({
      weekStart,
      weekEnd,
      totals: { reportCount: reports.length, activeMemberCount: activeMembers.size },
      perProject,
    });
  } catch (e) {
    console.error("[core.reports.weeklySummary]", e);
    return err(ERR.DB_ERROR, "Failed to build weekly summary");
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function remove(actor: Actor, id: string): Promise<Result<{ id: string }>> {
  const perm = requirePerm(actor, "reports.delete");
  if (!perm.ok) return perm;

  try {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return err(ERR.NOT_FOUND, `Report ${id} not found`);

    await prisma.report.delete({ where: { id } });
    await logAction({
      actor,
      action: "report.delete",
      entity: "report",
      entityId: id,
    });
    return ok({ id });
  } catch (e) {
    console.error("[core.reports.remove]", e);
    return err(ERR.DB_ERROR, "Failed to delete report");
  }
}

// Note : `hasPerm` est exposé pour permettre aux wrappers Server Actions
// de tester finement (par ex. masquer un bouton si reports.delete refusé)
export { hasPerm };
