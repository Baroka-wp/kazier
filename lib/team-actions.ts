"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import type { Task } from "@/lib/task-actions";

function parseAssignedTo(value: unknown): number[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\{(.*)\}/);
    if (match) {
      return match[1].split(",").map((v: string) => parseInt(v.trim()));
    }
  }
  return [];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProjectWithTasks = {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  team_members: Array<{ id: number; full_name: string }>;
  tasks: Task[];
};

export type TeamMember = {
  id: number;
  full_name: string;
};

// ── Helper : enrichir les tâches avec les noms des assignés ──────────────────

type PrismaTask = {
  id: number;
  title: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  project_id: number | null;
  assigned_to: unknown;
  due_date: Date | null;
  created_at: Date;
};

async function enrichTasksWithNames(tasks: PrismaTask[]): Promise<Task[]> {
  // Collecter tous les IDs uniques en une seule requête au lieu d'une par tâche
  const allIds = [...new Set(tasks.flatMap((t) => parseAssignedTo(t.assigned_to)))];

  const namesMap: Record<number, string> = {};
  if (allIds.length > 0) {
    const members = await prisma.teams.findMany({
      where: {
        id: {
          in: allIds,
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
    });

    for (const m of members) {
      namesMap[m.id] = `${m.first_name || ""} ${m.last_name || ""}`.trim();
    }
  }

  return tasks.map((task) => {
    const assignedIds = parseAssignedTo(task.assigned_to);
    return {
      id: task.id,
      title: task.title ?? "",
      description: task.description ?? "",
      status: (task.status as "à faire" | "en cours" | "review" | "terminée") ?? "à faire",
      priority: (task.priority as "low" | "medium" | "high") ?? "medium",
      project_id: task.project_id,
      assigned_to: assignedIds,
      due_date: task.due_date ? task.due_date.toISOString().split("T")[0] : null,
      created_at: task.created_at.toISOString(),
      assigned_to_names: assignedIds.map((id: number) => namesMap[id]).filter(Boolean),
    };
  });
}

// ── getProjectsWithTasksForTeamMember ─────────────────────────────────────────

export async function getProjectsWithTasksForTeamMember(teamMemberId: number): Promise<{
  success: boolean;
  projects?: ProjectWithTasks[];
  error?: string;
}> {
  try {
    const memberId = typeof teamMemberId === "string" ? parseInt(teamMemberId) : teamMemberId;

    const projects = await prisma.project.findMany({
      where: {
        team_ids: {
          has: memberId,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const teamIds = parseAssignedTo(project.team_ids);

        // Récupérer les tâches
        const tasksResult = await prisma.tasks.findMany({
          where: {
            project_id: project.id,
            OR: [{ assigned_to: { isEmpty: true } }, { assigned_to: { has: memberId } }],
          },
          orderBy: {
            created_at: "desc",
          },
        });

        const enrichedTasks = await enrichTasksWithNames(tasksResult);

        // Membres du projet
        const members = await prisma.teams.findMany({
          where: {
            id: {
              in: teamIds,
            },
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
          orderBy: {
            first_name: "asc",
          },
        });

        const team_members = members.map((m) => ({
          id: m.id,
          full_name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
        }));

        return {
          id: project.id,
          name: project.name || "Sans nom",
          description: project.description || "Aucune description",
          icon: project.icon,
          team_members,
          tasks: enrichedTasks,
        };
      })
    );

    return { success: true, projects: enrichedProjects };
  } catch (err: unknown) {
    console.error(
      "[getProjectsWithTasksForTeamMember]",
      err instanceof Error ? err.message : String(err)
    );
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── getTasksByProject ─────────────────────────────────────────────────────────

export async function getTasksByProject(
  projectId: number,
  teamMemberId: number
): Promise<{
  success: boolean;
  tasks?: Task[];
  error?: string;
}> {
  try {
    const memberId = typeof teamMemberId === "string" ? parseInt(teamMemberId) : teamMemberId;

    const result = await prisma.tasks.findMany({
      where: {
        project_id: projectId,
        OR: [{ assigned_to: { isEmpty: true } }, { assigned_to: { has: memberId } }],
      },
      orderBy: [{ status: "asc" }, { created_at: "desc" }],
    });

    const enrichedTasks = await enrichTasksWithNames(result);

    return { success: true, tasks: enrichedTasks };
  } catch (err: unknown) {
    console.error("[getTasksByProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des tâches." };
  }
}

// ── assignTaskToSelf ──────────────────────────────────────────────────────────

export async function assignTaskToSelf(
  taskId: number,
  teamMemberId: number
): Promise<{
  success: boolean;
  task?: Task;
  error?: string;
}> {
  try {
    const memberId = typeof teamMemberId === "string" ? parseInt(teamMemberId) : teamMemberId;

    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { id: true, assigned_to: true },
    });

    if (!task) return { success: false, error: "Tâche non trouvée." };

    const assignedIds = parseAssignedTo(task.assigned_to);
    if (assignedIds.includes(memberId))
      return { success: false, error: "Vous êtes déjà assigné à cette tâche." };

    const newAssignedIds = [...assignedIds, memberId];

    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { assigned_to: newAssignedIds },
    });

    const [enriched] = await enrichTasksWithNames([updated]);

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks"); // 👈
    revalidatePath("/dashboard"); // 👈
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[assignTaskToSelf]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de l'assignation." };
  }
}

// ── unassignTaskFromSelf ──────────────────────────────────────────────────────

export async function unassignTaskFromSelf(
  taskId: number,
  teamMemberId: number
): Promise<{
  success: boolean;
  task?: Task;
  error?: string;
}> {
  try {
    const memberId = typeof teamMemberId === "string" ? parseInt(teamMemberId) : teamMemberId;

    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { id: true, assigned_to: true },
    });

    if (!task) return { success: false, error: "Tâche non trouvée." };

    const assignedIds = parseAssignedTo(task.assigned_to);
    if (!assignedIds.includes(memberId))
      return { success: false, error: "Vous n'êtes pas assigné à cette tâche." };

    const newAssignedIds = assignedIds.filter((id) => id !== memberId);

    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { assigned_to: newAssignedIds.length > 0 ? newAssignedIds : [] },
    });

    const [enriched] = await enrichTasksWithNames([updated]);

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks"); // 👈
    revalidatePath("/dashboard"); // 👈
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[unassignTaskFromSelf]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la désassignation." };
  }
}

// ── updateTaskStatus ──────────────────────────────────────────────────────────

export async function updateTaskStatus(
  taskId: number,
  newStatus: "à faire" | "en cours" | "review" | "terminée"
): Promise<{
  success: boolean;
  task?: Task;
  error?: string;
}> {
  try {
    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    if (!updated) return { success: false, error: "Tâche non trouvée." };

    const [enriched] = await enrichTasksWithNames([updated]);

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks"); // 👈 ajouter
    revalidatePath("/dashboard"); // 👈 ajouter
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[updateTaskStatus]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la mise à jour du statut." };
  }
}

// ── getTeamsForAssignment ─────────────────────────────────────────────────────

export async function getTeamsForAssignment(): Promise<{
  success: boolean;
  teams?: TeamMember[];
  error?: string;
}> {
  try {
    const result = await prisma.teams.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
      orderBy: {
        first_name: "asc",
      },
    });

    const teams = result.map((row) => ({
      id: row.id,
      full_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    }));

    return { success: true, teams };
  } catch (err: unknown) {
    console.error("[getTeamsForAssignment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}
