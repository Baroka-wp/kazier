"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { type Task, notifyTaskReview } from "@/lib/task-actions";

// ── Helper: normaliser assigned_to ───────────────────────────────────────────

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

// ── Helper: type Prisma brut pour une tâche ───────────────────────────────────

type PrismaTask = {
  id: number;
  title: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  project_id: number | null;
  assigned_to: unknown;
  start_date: Date | null;
  due_date: Date | null;
  created_at: Date;
};

// ── Helper: enrichir les tâches avec les noms des assignés ───────────────────
// Optimisé : une seule requête DB pour tous les membres au lieu d'une par tâche

async function enrichTasksWithNames(tasks: PrismaTask[]): Promise<Task[]> {
  const allIds = [...new Set(tasks.flatMap((t) => parseAssignedTo(t.assigned_to)))];

  const namesMap: Record<number, string> = {};
  if (allIds.length > 0) {
    const members = await prisma.teams.findMany({
      where: { id: { in: allIds } },
      select: { id: true, first_name: true, last_name: true },
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
      start_date: task.start_date ? task.start_date.toISOString().split("T")[0] : null,
      due_date: task.due_date ? task.due_date.toISOString().split("T")[0] : null,
      created_at: task.created_at.toISOString(),
      assigned_to_names: assignedIds.map((id: number) => namesMap[id]).filter(Boolean),
    };
  });
}

// ── getProjectsWithTasksForTeamMember ─────────────────────────────────────────
// Récupère tous les projets dont le membre fait partie,
// avec les tâches qui lui sont assignées ou non assignées

export async function getProjectsWithTasksForTeamMember(teamMemberId: number): Promise<{
  success: boolean;
  projects?: ProjectWithTasks[];
  error?: string;
}> {
  try {
    const memberId = typeof teamMemberId === "string" ? parseInt(teamMemberId) : teamMemberId;

    const projects = await prisma.project.findMany({
      where: { team_ids: { has: memberId } },
      orderBy: { name: "asc" },
    });

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const teamIds = parseAssignedTo(project.team_ids);

        // Tâches du projet : non assignées OU assignées au membre
        const tasksResult = await prisma.tasks.findMany({
          where: {
            project_id: project.id,
            OR: [{ assigned_to: { isEmpty: true } }, { assigned_to: { has: memberId } }],
          },
          orderBy: { created_at: "desc" },
        });

        const enrichedTasks = await enrichTasksWithNames(tasksResult);

        // Membres du projet
        const members = await prisma.teams.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, first_name: true, last_name: true },
          orderBy: { first_name: "asc" },
        });

        return {
          id: project.id,
          name: project.name || "Sans nom",
          description: project.description || "Aucune description",
          icon: project.icon,
          team_members: members.map((m) => ({
            id: m.id,
            full_name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
          })),
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
// Récupère les tâches d'un projet pour un membre spécifique
// (tâches non assignées + tâches assignées au membre)

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
// Permet à un membre de s'assigner lui-même à une tâche

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

    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { assigned_to: [...assignedIds, memberId] },
    });

    const [enriched] = await enrichTasksWithNames([updated]);

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[assignTaskToSelf]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de l'assignation." };
  }
}

// ── unassignTaskFromSelf ──────────────────────────────────────────────────────
// Permet à un membre de se désassigner d'une tâche

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

    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { assigned_to: assignedIds.filter((id) => id !== memberId) },
    });

    const [enriched] = await enrichTasksWithNames([updated]);

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[unassignTaskFromSelf]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la désassignation." };
  }
}

// ── updateTaskStatus ──────────────────────────────────────────────────────────
// Met à jour le statut d'une tâche depuis le kanban (drag & drop)
// Déclenche une notification Slack au SA + TM si la tâche passe en "review"

export async function updateTaskStatus(
  taskId: number,
  newStatus: "à faire" | "en cours" | "review" | "terminée"
): Promise<{
  success: boolean;
  task?: Task;
  error?: string;
}> {
  try {
    // Récupérer le statut actuel avant mise à jour
    const existing = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    const updated = await prisma.tasks.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    if (!updated) return { success: false, error: "Tâche non trouvée." };

    const [enriched] = await enrichTasksWithNames([updated]);

    // ✅ Notifier SA + TM si la tâche vient de passer en "review"
    const wasNotReview = existing?.status !== "review";
    const isNowReview = newStatus === "review";
    if (wasNotReview && isNowReview) {
      notifyTaskReview(enriched).catch((err) =>
        console.error("[updateTaskStatus] notifyTaskReview error:", err)
      );
    }

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[updateTaskStatus]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la mise à jour du statut." };
  }
}

// ── getTeamsForAssignment ─────────────────────────────────────────────────────
// Récupère tous les membres disponibles pour assignation

export async function getTeamsForAssignment(): Promise<{
  success: boolean;
  teams?: TeamMember[];
  error?: string;
}> {
  try {
    const result = await prisma.teams.findMany({
      select: { id: true, first_name: true, last_name: true },
      orderBy: { first_name: "asc" },
    });

    return {
      success: true,
      teams: result.map((row) => ({
        id: row.id,
        full_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      })),
    };
  } catch (err: unknown) {
    console.error("[getTeamsForAssignment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}
