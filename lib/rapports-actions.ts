"use server";

/**
 * Wrapper Server Action — page Rapports.
 * Délègue à lib/core/reports avec adaptation de shape pour l'UI.
 */

import { reports as reportsCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type RapportWithDetails = {
  id: string;
  team_id: string | null;
  project_id: string | null;
  full_name: string;
  role: string;
  built: string | null;
  working_built: string | null;
  blocked: string | null;
  validated_learning: string | null;
  needed_learning: string | null;
  tomorrow_build: string | null;
  extra_message: string | null;
  submitted_at: Date;
  project_name: string;
  project_icon?: string;
};

export type ProjectSimple = {
  id: string;
  name: string | null;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  projectId?: string;
  dateFilter?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function periodFromFilter(f: string | undefined): { from?: string; to?: string } {
  if (!f) return {};
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (f === "today") return { from: fmt(now) };
  if (f === "week") {
    const day = now.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + offset);
    return { from: fmt(monday) };
  }
  if (f === "month") {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: fmt(monthStart) };
  }
  return {};
}

export async function getRapportsData(
  params?: PaginationParams
): Promise<PaginatedResult<RapportWithDetails> & { roles: string[]; projects: ProjectSimple[] }> {
  const session = await auth();
  if (!session) redirect("/login");
  const actor = await currentActor();

  const { from, to } = periodFromFilter(params?.dateFilter);

  const res = await reportsCore.list(actor, {
    page: params?.page,
    limit: params?.limit,
    search: params?.search,
    projectId: params?.projectId,
    from,
    to,
  });
  if (!res.ok) throw new Error(res.message);

  // Pour les rôles, on lit les Member dans le batch
  const { prisma } = await import("@/lib/core");
  const memberIds = [...new Set(res.data.data.map((r) => r.memberId))];
  const memberRoles = memberIds.length
    ? await prisma.member.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, role: true },
      })
    : [];
  const roleByMember = new Map(memberRoles.map((m) => [m.id, m.role]));

  // Filtre rôle (post-fetch — peu coûteux car données déjà petites)
  let rows = res.data.data;
  if (params?.role) {
    rows = rows.filter((r) => roleByMember.get(r.memberId) === params.role);
  }

  const data: RapportWithDetails[] = rows.map((r) => ({
    id: r.id,
    team_id: r.memberId,
    project_id: r.projectId,
    full_name: r.memberName,
    role: roleByMember.get(r.memberId) ?? "MEMBER",
    built: r.workCompleted,
    working_built: r.inProgress,
    blocked: r.blockers,
    validated_learning: r.learnings,
    needed_learning: r.learningNeeded,
    tomorrow_build: r.tomorrowPlan,
    extra_message: r.extraMessage,
    submitted_at: r.createdAt,
    project_name: r.projectName ?? "Sans projet",
  }));

  // Pour les filtres : tous les projets + tous les rôles distincts
  const [allProjects, allRoles] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      select: { role: true },
      distinct: ["role"],
    }),
  ]);

  return {
    data,
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
    totalPages: res.data.totalPages,
    roles: allRoles.map((r) => r.role).filter(Boolean) as string[],
    projects: allProjects.map((p) => ({ id: p.id, name: p.name })),
  };
}
