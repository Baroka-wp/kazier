"use server";

/**
 * Wrappers Server Actions — pages Projets.
 * Délègue à lib/core/projects et lib/core/members puis adapte le shape.
 */

import { projects, members as membersCore } from "@/lib/core";
import type { ProjectRow, ProjectDetail } from "@/lib/core/projects";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

// ── Types historiques préservés ──────────────────────────────────────────

export type TeamMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  User?: {
    id: string;
    email: string | null;
    role: string | null;
  } | null;
};

export type Project = {
  id: string;
  name: string | null;
  description: string | null;
  icon: string | null;
  created_at?: Date;
  team_ids: string[];
  team_members?: TeamMember[];
  objectives?: string | null;
  stakeholders?: string | null;
  start_date?: Date | null;
  end_date?: Date | null;
};

export type CreateProjectData = {
  name: string;
  description: string;
  icon?: string | null;
  team_ids?: string[];
  objectives?: string | null;
  stakeholders?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type UpdateProjectData = Partial<CreateProjectData>;

export type ProjectResult = { success: true; project: Project } | { success: false; error: string };

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Helpers d'adaptation ─────────────────────────────────────────────────

function fromRow(p: ProjectRow, membersList: TeamMember[] = []): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    created_at: p.createdAt,
    team_ids: membersList.map((m) => m.id),
    team_members: membersList,
    objectives: p.objectives,
    stakeholders: p.stakeholders,
    start_date: p.startDate,
    end_date: p.endDate,
  };
}

function fromDetail(p: ProjectDetail): Project {
  const teamMembers: TeamMember[] = p.members.map((m) => ({
    id: m.memberId,
    first_name: m.fullName.split(" ")[0] ?? null,
    last_name: m.fullName.split(" ").slice(1).join(" ") || null,
    full_name: m.fullName,
    User: null, // chargé séparément si besoin via getTeams()
  }));
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    created_at: p.createdAt,
    team_ids: teamMembers.map((m) => m.id),
    team_members: teamMembers,
    objectives: p.objectives,
    stakeholders: p.stakeholders,
    start_date: p.startDate,
    end_date: p.endDate,
  };
}

// ── createProject ────────────────────────────────────────────────────────

export async function createProject(data: CreateProjectData): Promise<ProjectResult> {
  try {
    const actor = await currentActor();
    const res = await projects.create(actor, {
      name: data.name,
      description: data.description,
      icon: data.icon ?? undefined,
      objectives: data.objectives ?? undefined,
      stakeholders: data.stakeholders ?? undefined,
      startDate: data.start_date ?? undefined,
      endDate: data.end_date ?? undefined,
      memberIds: data.team_ids ?? [],
    });
    if (!res.ok) return { success: false, error: res.message };
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { success: true, project: fromDetail(res.data) };
  } catch (e) {
    console.error("[createProject]", e);
    return { success: false, error: "Erreur lors de la création du projet." };
  }
}

// ── getProject ───────────────────────────────────────────────────────────

export async function getProject(id: string): Promise<ProjectResult> {
  try {
    const actor = await currentActor();
    const res = await projects.get(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    return { success: true, project: fromDetail(res.data) };
  } catch (e) {
    console.error("[getProject]", e);
    return { success: false, error: "Erreur lors de la récupération du projet." };
  }
}

// ── getProjects ──────────────────────────────────────────────────────────

export async function getProjects(
  params?: PaginationParams
): Promise<PaginatedResult<Project> | { success: boolean; projects?: Project[]; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await projects.list(actor, {
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      memberId: params?.teamId,
    });
    if (!res.ok) return { success: false, error: res.message };

    // Pour chaque projet, on enrichit les members (l'UI les affiche)
    const enriched = await Promise.all(
      res.data.data.map(async (p) => {
        const detail = await projects.get(actor, p.id);
        if (detail.ok) {
          return fromDetail(detail.data);
        }
        return fromRow(p);
      })
    );

    if (!params) {
      return { success: true, projects: enriched };
    }
    return {
      data: enriched,
      total: res.data.total,
      page: res.data.page,
      limit: res.data.limit,
      totalPages: res.data.totalPages,
    };
  } catch (e) {
    console.error("[getProjects]", e);
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── updateProject ────────────────────────────────────────────────────────

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<ProjectResult> {
  try {
    const actor = await currentActor();
    const res = await projects.update(actor, id, {
      name: data.name,
      description: data.description,
      icon: data.icon ?? undefined,
      objectives: data.objectives ?? undefined,
      stakeholders: data.stakeholders ?? undefined,
      startDate: data.start_date ?? undefined,
      endDate: data.end_date ?? undefined,
    });
    if (!res.ok) return { success: false, error: res.message };

    // Si team_ids fourni, on synchronise les ProjectMembers via add/remove
    if (data.team_ids !== undefined) {
      const detail = await projects.get(actor, id);
      if (detail.ok) {
        const current = new Set(detail.data.members.map((m) => m.memberId));
        const next = new Set(data.team_ids);
        const toAdd = [...next].filter((x) => !current.has(x));
        const toRemove = [...current].filter((x) => !next.has(x));
        await Promise.all([
          ...toAdd.map((memberId) =>
            projects.addMember(actor, { projectId: id, memberId })
          ),
          ...toRemove.map((memberId) =>
            projects.removeMember(actor, { projectId: id, memberId })
          ),
        ]);
      }
    }

    const refreshed = await projects.get(actor, id);
    if (!refreshed.ok) return { success: false, error: refreshed.message };

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { success: true, project: fromDetail(refreshed.data) };
  } catch (e) {
    console.error("[updateProject]", e);
    return { success: false, error: "Erreur lors de la modification du projet." };
  }
}

// ── deleteProject ────────────────────────────────────────────────────────

export async function deleteProject(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await projects.remove(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteProject]", e);
    return { success: false, error: "Erreur lors de la suppression du projet." };
  }
}

// ── getTeams (liste tous les membres pour pickers) ──────────────────────

export async function getTeams(): Promise<{
  success: boolean;
  teams?: TeamMember[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await membersCore.list(actor, { limit: 100 });
    if (!res.ok) return { success: false, error: res.message };

    const teams: TeamMember[] = res.data.data.map((m) => ({
      id: m.id,
      first_name: m.firstName,
      last_name: m.lastName,
      full_name: m.fullName,
      User: m.hasAuth
        ? { id: m.id, email: m.email, role: m.role }
        : null,
    }));
    return { success: true, teams };
  } catch (e) {
    console.error("[getTeams]", e);
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}
