"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPermissions } from "@/lib/permissions";

async function requireTeamManagement() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  const userRole = (session.user as { role?: string }).role;
  const permissions = getPermissions(userRole ?? null);
  if (!permissions.canManageTeam) throw new Error("Non autorisé: permissions insuffisantes");
  return session.user;
}

export type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  User?: {
    id: number;
    email: string | null;
    role: string | null;
  } | null;
};

export type Project = {
  id: number;
  name: string | null;
  description: string | null;
  icon: string | null;
  team_ids: number[];
  team_members?: TeamMember[];
};

export type CreateProjectData = {
  name: string;
  description: string;
  icon?: string | null;
  team_ids?: number[];
};

export type UpdateProjectData = Partial<CreateProjectData>;

export type ProjectResult = { success: true; project: Project } | { success: false; error: string };

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function sendSlackProjectAssignment(params: {
  slack_id: string;
  first_name: string;
  project_name: string;
  project_icon: string;
}) {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: params.slack_id,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `Bonjour *${params.first_name}* 👋` },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📁 Vous avez été ajouté au projet *${params.project_name}* !\n\nVous faites maintenant partie de ce projet. Pensez à soumettre votre rapport quotidien.`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "📝 Soumettre mon rapport" },
                url: process.env.NEXT_PUBLIC_FORM_URL,
                style: "primary",
              },
            ],
          },
        ],
      }),
    });
    const data = await response.json();
    if (!data.ok) console.error("[sendSlackProjectAssignment]", data.error);
  } catch (err) {
    console.error("[sendSlackProjectAssignment]", err);
  }
}

function validateProject(
  data: CreateProjectData
): { valid: true } | { valid: false; error: string } {
  const name = data.name?.trim();
  if (!name || name.length < 2)
    return { valid: false, error: "Le nom doit contenir au moins 2 caractères." };
  if (name.length > 100)
    return { valid: false, error: "Le nom est trop long (100 caractères max)." };
  const description = data.description?.trim();
  if (!description || description.length < 5)
    return { valid: false, error: "La description doit contenir au moins 5 caractères." };
  if (description.length > 500)
    return { valid: false, error: "La description est trop longue (500 caractères max)." };
  return { valid: true };
}

async function populateTeamMembers(team_ids: number[]): Promise<TeamMember[]> {
  if (!team_ids.length) return [];
  try {
    const members = await prisma.teams.findMany({
      where: { id: { in: team_ids } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        users: { take: 1 },
      },
      orderBy: { first_name: "asc" },
    });
    return members.map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      full_name: `${m.first_name} ${m.last_name}`,
      User: m.users[0] ?? null,
    }));
  } catch (err) {
    console.error("[populateTeamMembers]", err);
    return [];
  }
}

export async function createProject(data: CreateProjectData): Promise<ProjectResult> {
  try {
    await requireTeamManagement();
    const validation = validateProject(data);
    if (!validation.valid) return { success: false, error: validation.error };

    const name = data.name.trim();
    const description = data.description.trim();
    const icon = data.icon || null;
    const team_ids = data.team_ids || [];

    const project = await prisma.project.create({
      data: { name, description, icon, team_ids },
    });

    const members = await populateTeamMembers(team_ids);

    if (team_ids.length > 0) {
      const membersWithSlack = await prisma.teams.findMany({
        where: { id: { in: team_ids }, slack_id: { not: null } },
        select: { id: true, first_name: true, slack_id: true },
      });
      await Promise.all(
        membersWithSlack.map((m) =>
          sendSlackProjectAssignment({
            slack_id: m.slack_id!,
            first_name: m.first_name ?? "",
            project_name: name,
            project_icon: icon || "",
          })
        )
      );
    }

    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        icon: project.icon,
        team_ids: project.team_ids,
        team_members: members,
      },
    };
  } catch (err: unknown) {
    console.error("[createProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la création du projet." };
  }
}

export async function getProject(id: number): Promise<ProjectResult> {
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return { success: false, error: "Projet non trouvé." };
    const members = await populateTeamMembers(project.team_ids);
    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        icon: project.icon,
        team_ids: project.team_ids,
        team_members: members,
      },
    };
  } catch (err: unknown) {
    console.error("[getProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération du projet." };
  }
}

export async function getProjects(
  params?: PaginationParams
): Promise<PaginatedResult<Project> | { success: boolean; projects?: Project[]; error?: string }> {
  if (!params) {
    const projects = await prisma.project.findMany({ orderBy: { id: "desc" } });
    const typedProjects: Project[] = await Promise.all(
      projects.map(async (p) => {
        const members = await populateTeamMembers(p.team_ids);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          icon: p.icon,
          team_ids: p.team_ids,
          team_members: members,
        };
      })
    );
    return { success: true, projects: typedProjects };
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const search = params.search;

  type WhereClause = {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      description?: { contains: string; mode: "insensitive" };
    }>;
    team_ids?: { has: number }; // 👈 ajouter
  };
  const where: WhereClause = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ];
  }

  // const total = await prisma.project.count({ where });
  // 👇 Filtrer par team_id si TM

  if (params.teamId) {
    where.team_ids = { has: params.teamId };
  }

  const total = await prisma.project.count({ where });

  const projects = await prisma.project.findMany({
    where,
    orderBy: { id: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const typedProjects: Project[] = await Promise.all(
    projects.map(async (p) => {
      const members = await populateTeamMembers(p.team_ids);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        icon: p.icon,
        team_ids: p.team_ids,
        team_members: members,
      };
    })
  );

  return {
    data: typedProjects,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateProject(id: number, data: UpdateProjectData): Promise<ProjectResult> {
  try {
    await requireTeamManagement();
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Projet non trouvé." };

    const oldTeamIds = existing.team_ids;
    const mergedData: CreateProjectData = {
      name: data.name ?? existing.name ?? "",
      description: data.description ?? existing.description ?? "",
      icon: data.icon !== undefined ? data.icon : existing.icon,
      team_ids: data.team_ids ?? oldTeamIds,
    };

    const validation = validateProject(mergedData);
    if (!validation.valid) return { success: false, error: validation.error };

    const newTeamIds = mergedData.team_ids || [];

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: mergedData.name.trim(),
        description: mergedData.description.trim(),
        icon: mergedData.icon,
        team_ids: newTeamIds,
      },
    });

    const addedIds = newTeamIds.filter((tid: number) => !oldTeamIds.includes(tid));
    if (addedIds.length > 0) {
      const newMembers = await prisma.teams.findMany({
        where: { id: { in: addedIds }, slack_id: { not: null } },
        select: { id: true, first_name: true, slack_id: true },
      });
      await Promise.all(
        newMembers.map((m) =>
          sendSlackProjectAssignment({
            slack_id: m.slack_id!,
            first_name: m.first_name ?? "",
            project_name: mergedData.name.trim(),
            project_icon: mergedData.icon || "",
          })
        )
      );
    }

    const members = await populateTeamMembers(newTeamIds);

    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");

    return {
      success: true,
      project: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        icon: updated.icon,
        team_ids: updated.team_ids,
        team_members: members,
      },
    };
  } catch (err: unknown) {
    console.error("[updateProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la modification du projet." };
  }
}

export async function deleteProject(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await requireTeamManagement();
    await prisma.project.delete({ where: { id } });
    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la suppression du projet." };
  }
}

export async function getTeams(): Promise<{
  success: boolean;
  teams?: TeamMember[];
  error?: string;
}> {
  try {
    const teams = await prisma.teams.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
        users: { take: 1 },
      },
      orderBy: { first_name: "asc" },
    });
    return {
      success: true,
      teams: teams.map((t) => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        full_name: `${t.first_name} ${t.last_name}`,
        User: t.users[0] ?? null,
      })),
    };
  } catch (err: unknown) {
    console.error("[getTeams]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}
