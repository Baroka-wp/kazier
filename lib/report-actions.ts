"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPermissions } from "@/lib/permissions";

// ── Helper: Vérifier authentification et permissions ─────────────────────────

async function requireReportPermission(permission: "canEditReports" | "canDeleteReports") {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userRole = (session.user as { role?: string }).role;
  const permissions = getPermissions(userRole ?? null);

  if (!permissions[permission]) {
    throw new Error("Non autorisé: permissions insuffisantes");
  }

  return session.user;
}

export type Report = {
  id: number;
  work_built: string | null;
  working_built: string | null;
  broken_features: string | null;
  validated_learning: string | null;
  needed_learning: string | null;
  tomorrow_build: string | null;
  created_at: string;
  submitted_at?: string;
  team_id: number | null;
  project_id: number | null;
  full_name: string;
  role: string;
  project_name: string;
};

export async function deleteReport(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireReportPermission("canDeleteReports");

    await prisma.rapports.delete({
      where: { id },
    });
    revalidatePath("/dashboard/rapports");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[deleteReport]", err);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

export async function updateReport(
  id: number,
  data: {
    work_built?: string;
    working_built?: string;
    broken_features?: string;
    validated_learning?: string;
    needed_learning?: string;
    tomorrow_build?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireReportPermission("canEditReports");

    // Filtrer les champs définis
    type UpdateData = {
      work_built?: string;
      working_built?: string;
      broken_features?: string;
      validated_learning?: string;
      needed_learning?: string;
      tomorrow_build?: string;
    };
    const updateData: UpdateData = {};
    if (data.work_built !== undefined) updateData.work_built = data.work_built;
    if (data.working_built !== undefined) updateData.working_built = data.working_built;
    if (data.broken_features !== undefined) updateData.broken_features = data.broken_features;
    if (data.validated_learning !== undefined)
      updateData.validated_learning = data.validated_learning;
    if (data.needed_learning !== undefined) updateData.needed_learning = data.needed_learning;
    if (data.tomorrow_build !== undefined) updateData.tomorrow_build = data.tomorrow_build;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    await prisma.rapports.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/rapports");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateReport]", err);
    return { success: false, error: "Erreur lors de la modification." };
  }
}

// ── GET REPORTS WITH PROJECT NAMES ────────────────────────────────────────────

export async function getReportsWithProjects(): Promise<{
  success: boolean;
  reports?: Report[];
  projects?: Array<{ id: number; name: string }>;
  error?: string;
}> {
  try {
    // Récupérer les rapports avec les infos utilisateur et projet
    const reportsResult = await prisma.rapports.findMany({
      include: {
        team: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Récupérer les utilisateurs pour avoir les rôles
    const usersByTeamId = new Map();
    const users = await prisma.users.findMany({
      select: {
        team_id: true,
        role: true,
      },
    });
    users.forEach((u) => {
      if (u.team_id) usersByTeamId.set(u.team_id, u.role);
    });

    // Récupérer la liste des projets pour le filtre
    const projectsResult = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const reports = reportsResult.map((r) => ({
      id: r.id,
      work_built: r.work_built,
      working_built: r.working_built,
      broken_features: r.broken_features,
      validated_learning: r.validated_learning,
      needed_learning: r.needed_learning,
      tomorrow_build: r.tomorrow_build,
      created_at: r.created_at.toISOString(),
      team_id: r.team_id,
      project_id: r.project_id,
      full_name: r.team ? `${r.team.first_name} ${r.team.last_name}` : "Unknown",
      role: usersByTeamId.get(r.team_id) || "T",
      project_name: r.project?.name || "Sans projet",
    }));

    const projects = projectsResult.map((p) => ({
      id: p.id,
      name: p.name || "Sans nom",
    }));

    return { success: true, reports, projects };
  } catch (err: unknown) {
    console.error("[getReportsWithProjects]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des rapports." };
  }
}
