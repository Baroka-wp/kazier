"use server";

/**
 * Wrappers Server Actions — édition/suppression d'un rapport.
 * Délègue à lib/core/reports + un update via prisma direct (le core n'expose
 * pas d'update : on garde le comportement historique pour ne pas casser l'UI).
 */

import { prisma, reports as reportsCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

export type Report = {
  id: string;
  work_built: string | null;
  working_built: string | null;
  broken_features: string | null;
  validated_learning: string | null;
  needed_learning: string | null;
  tomorrow_build: string | null;
  extra_message: string | null;
  created_at: string;
  submitted_at?: string;
  team_id: string | null;
  project_id: string | null;
  full_name: string;
  role: string;
  project_name: string;
};

export async function deleteReport(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await reportsCore.remove(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    revalidatePath("/dashboard/rapports");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteReport]", e);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

export async function updateReport(
  id: string,
  data: {
    work_built?: string;
    working_built?: string;
    broken_features?: string;
    validated_learning?: string;
    needed_learning?: string;
    tomorrow_build?: string;
    extra_message?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN" || actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Permission refusée." };
    }

    const mapped: {
      workCompleted?: string;
      inProgress?: string;
      blockers?: string;
      learnings?: string;
      learningNeeded?: string;
      tomorrowPlan?: string;
      extraMessage?: string;
    } = {};
    if (data.work_built !== undefined) mapped.workCompleted = data.work_built;
    if (data.working_built !== undefined) mapped.inProgress = data.working_built;
    if (data.broken_features !== undefined) mapped.blockers = data.broken_features;
    if (data.validated_learning !== undefined) mapped.learnings = data.validated_learning;
    if (data.needed_learning !== undefined) mapped.learningNeeded = data.needed_learning;
    if (data.tomorrow_build !== undefined) mapped.tomorrowPlan = data.tomorrow_build;
    if (data.extra_message !== undefined) mapped.extraMessage = data.extra_message;

    if (Object.keys(mapped).length === 0) return { success: true };

    await prisma.report.update({ where: { id }, data: mapped });
    revalidatePath("/dashboard/rapports");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[updateReport]", e);
    return { success: false, error: "Erreur lors de la modification." };
  }
}

export async function getReportsWithProjects(): Promise<{
  success: boolean;
  reports?: Report[];
  projects?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await reportsCore.list(actor, { limit: 1000 });
    if (!res.ok) return { success: false, error: res.message };

    const memberIds = [...new Set(res.data.data.map((r) => r.memberId))];
    const roles = memberIds.length
      ? await prisma.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, role: true },
        })
      : [];
    const roleById = new Map(roles.map((m) => [m.id, m.role]));

    const reports: Report[] = res.data.data.map((r) => ({
      id: r.id,
      work_built: r.workCompleted,
      working_built: r.inProgress,
      broken_features: r.blockers,
      validated_learning: r.learnings,
      needed_learning: r.learningNeeded,
      tomorrow_build: r.tomorrowPlan,
      extra_message: r.extraMessage,
      created_at: r.createdAt.toISOString(),
      team_id: r.memberId,
      project_id: r.projectId,
      full_name: r.memberName,
      role: roleById.get(r.memberId) ?? "MEMBER",
      project_name: r.projectName ?? "Sans projet",
    }));

    const projects = await prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      reports,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    };
  } catch (e) {
    console.error("[getReportsWithProjects]", e);
    return { success: false, error: "Erreur lors de la récupération des rapports." };
  }
}
