"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
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

export type ProjectResult =
  | { success: true; project: Project }
  | { success: false; error: string };

// ── Slack : notifier un membre ajouté à un projet ─────────────────────────────

//Envoyer un message lorsqu'on ajoute un team à un projet 
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
        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: params.slack_id,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Bonjour *${params.first_name}* 👋`,
            },
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

// ── Validation ────────────────────────────────────────────────────────────────

function validateProject(data: CreateProjectData): { valid: true } | { valid: false; error: string } {
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

// ── Helper: Récupérer les infos des membres ───────────────────────────────────

async function populateTeamMembers(team_ids: number[]): Promise<TeamMember[]> {
  if (!team_ids.length) return [];
  try {
    const members = await prisma.teams.findMany({
      where: {
        id: { in: team_ids }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true
      },
      orderBy: {
        first_name: 'asc'
      }
    });
    return members.map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      full_name: `${m.first_name} ${m.last_name}`,
    }));
  } catch (err) {
    console.error("[populateTeamMembers]", err);
    return [];
  }
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createProject(data: CreateProjectData): Promise<ProjectResult> {
  try {
    const validation = validateProject(data);
    if (!validation.valid)
      return { success: false, error: validation.error };

    const name = data.name.trim();
    const description = data.description.trim();
    const icon = data.icon || null;
    const team_ids = data.team_ids || [];

    const project = await prisma.project.create({
      data: {
        name,
        description,
        icon,
        team_ids,
      }
    });

    const members = await populateTeamMembers(team_ids);

    // Notifier les membres ajoutés à la création
    if (team_ids.length > 0) {
      const membersWithSlack = await prisma.teams.findMany({
        where: {
          id: { in: team_ids },
          slack_id: { not: null }
        },
        select: {
          id: true,
          first_name: true,
          slack_id: true
        }
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

    const typedProject: Project = {
      id: project.id,
      name: project.name,
      description: project.description,
      icon: project.icon,
      team_ids: project.team_ids,
      team_members: members,
    };

    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");

    return { success: true, project: typedProject };
  } catch (err: any) {
    console.error("[createProject]", err);
    return { success: false, error: "Erreur lors de la création du projet." };
  }
}

// ── READ (GET ONE) ────────────────────────────────────────────────────────────

export async function getProject(id: number): Promise<ProjectResult> {
  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project)
      return { success: false, error: "Projet non trouvé." };

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
  } catch (err: any) {
    console.error("[getProject]", err);
    return { success: false, error: "Erreur lors de la récupération du projet." };
  }
}

// ── READ (GET ALL) ────────────────────────────────────────────────────────────

export async function getProjects(): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: 'desc' }
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

    return { success: true, projects: typedProjects };
  } catch (err: any) {
    console.error("[getProjects]", err);
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function updateProject(id: number, data: UpdateProjectData): Promise<ProjectResult> {
  try {
    // Récupérer le projet actuel
    const existing = await prisma.project.findUnique({
      where: { id }
    });

    if (!existing)
      return { success: false, error: "Projet non trouvé." };

    const oldTeamIds = existing.team_ids;

    // Fusionner avec les données existantes
    const mergedData: CreateProjectData = {
      name: data.name ?? existing.name ?? "",
      description: data.description ?? existing.description ?? "",
      icon: data.icon !== undefined ? data.icon : existing.icon,
      team_ids: data.team_ids ?? oldTeamIds,
    };

    const validation = validateProject(mergedData);
    if (!validation.valid)
      return { success: false, error: validation.error };

    const newTeamIds = mergedData.team_ids || [];

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: mergedData.name.trim(),
        description: mergedData.description.trim(),
        icon: mergedData.icon,
        team_ids: newTeamIds,
      }
    });

    // Détecter les nouveaux membres ajoutés
    const addedIds = newTeamIds.filter((tid: number) => !oldTeamIds.includes(tid));

    if (addedIds.length > 0) {
      const newMembers = await prisma.teams.findMany({
        where: {
          id: { in: addedIds },
          slack_id: { not: null }
        },
        select: {
          id: true,
          first_name: true,
          slack_id: true
        }
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

    const typedProject: Project = {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      team_ids: updated.team_ids,
      team_members: members,
    };

    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");

    return { success: true, project: typedProject };
  } catch (err: any) {
    console.error("[updateProject]", err);
    return { success: false, error: "Erreur lors de la modification du projet." };
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deleteProject(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.project.delete({
      where: { id }
    });
    revalidatePath("/dashboard/projets");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteProject]", err);
    return { success: false, error: "Erreur lors de la suppression du projet." };
  }
}

// ── GET TEAMS ─────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<{ success: boolean; teams?: TeamMember[]; error?: string }> {
  try {
    const teams = await prisma.teams.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true
      },
      orderBy: {
        first_name: 'asc'
      }
    });

    return {
      success: true,
      teams: teams.map((t) => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        full_name: `${t.first_name} ${t.last_name}`,
      })),
    };
  } catch (err: any) {
    console.error("[getTeams]", err);
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}