"use server";

import { prisma } from "./prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RapportWithDetails = {
  id: number;
  team_id: number | null;
  project_id: number | null;
  full_name: string;
  role: string;
  built: string | null;
  working_built: string | null;
  blocked: string | null;
  validated_learning: string | null;
  needed_learning: string | null;
  tomorrow_build: string | null;
  submitted_at: Date;
  project_name: string;
};

export type ProjectSimple = {
  id: number;
  name: string | null;
};

export type RapportsDataResult = {
  allReports: RapportWithDetails[];
  roles: string[];
  projects: ProjectSimple[];
};

// ── Get Rapports Data ─────────────────────────────────────────────────────────

export async function getRapportsData(): Promise<RapportsDataResult> {
  const [rapportsData, projectsData] = await Promise.all([
    prisma.rapports.findMany({
      include: {
        team: {
          include: {
            users: true
          }
        },
        project: true
      },
      orderBy: {
        created_at: 'desc'
      }
    }),

    prisma.project.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ]);

  // Transform reports data
  const allReports: RapportWithDetails[] = rapportsData.map(r => {
    const user = r.team?.users[0];
    return {
      id: r.id,
      team_id: r.team_id,
      project_id: r.project_id,
      full_name: `${r.team?.first_name || ''} ${r.team?.last_name || ''}`.trim(),
      role: user?.role ?? 'Membre',
      built: r.work_built,
      working_built: r.working_built,
      blocked: r.broken_features,
      validated_learning: r.validated_learning,
      needed_learning: r.needed_learning,
      tomorrow_build: r.tomorrow_build,
      submitted_at: r.created_at,
      project_name: r.project?.name ?? 'Sans projet'
    };
  });

  // Rôles distincts extraits depuis les résultats
  const roles = [...new Set(allReports.map(r => r.role).filter(Boolean))] as string[];

  // Transform projects data
  const projects: ProjectSimple[] = projectsData.map(p => ({
    id: p.id,
    name: p.name,
  }));

  return { allReports, roles, projects };
}
