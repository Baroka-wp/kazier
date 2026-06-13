"use server";

/**
 * Wrappers Server Actions — dashboard "Teams" (vue membre).
 * Délègue à lib/core. L'UI utilise encore les statuts en français
 * (à faire/en cours/review/terminée), on convertit aux frontières.
 */

import { tasks as tasksCore, projects, members } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

// ── Types historiques préservés (consommés par l'UI) ────────────────────

export type Task = {
  id: string;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  project_id: string | null;
  assigned_to: string[];
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  assigned_to_names?: string[];
};

export type ProjectWithTasks = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  team_members: Array<{ id: string; full_name: string }>;
  tasks: Task[];
};

export type TeamMember = { id: string; full_name: string };

// ── Mapping statut/priorité FR ↔ EN ─────────────────────────────────────

const STATUS_FR_TO_EN: Record<Task["status"], "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
  "à faire": "TODO",
  "en cours": "IN_PROGRESS",
  review: "REVIEW",
  terminée: "DONE",
};
const STATUS_EN_TO_FR: Record<string, Task["status"]> = {
  TODO: "à faire",
  IN_PROGRESS: "en cours",
  REVIEW: "review",
  DONE: "terminée",
  CANCELLED: "terminée", // l'UI ne connaît pas CANCELLED → on l'agrège dans terminée
};

function toUiTask(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  assigneeIds: string[];
  assigneeNames: string[];
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
}): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: STATUS_EN_TO_FR[t.status] ?? "à faire",
    priority: (t.priority.toLowerCase() as Task["priority"]) ?? "medium",
    project_id: t.projectId,
    assigned_to: t.assigneeIds,
    start_date: t.startDate ? t.startDate.toISOString().split("T")[0] : null,
    due_date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    created_at: t.createdAt.toISOString(),
    assigned_to_names: t.assigneeNames,
  };
}

// ── getProjectsWithTasksForTeamMember ───────────────────────────────────

export async function getProjectsWithTasksForTeamMember(teamMemberId: string): Promise<{
  success: boolean;
  projects?: ProjectWithTasks[];
  error?: string;
}> {
  try {
    const actor = await currentActor();

    // Tous les projets dont le membre fait partie
    const list = await projects.list(actor, { memberId: teamMemberId, limit: 100 });
    if (!list.ok) return { success: false, error: list.message };

    const enriched = await Promise.all(
      list.data.data.map(async (p) => {
        const detail = await projects.get(actor, p.id);
        const projectMembers = detail.ok
          ? detail.data.members.map((m) => ({ id: m.memberId, full_name: m.fullName }))
          : [];

        // Toutes les tâches du projet où le membre est assigné OU non assignée
        const taskList = await tasksCore.list(actor, { projectId: p.id, limit: 100 });
        const myTasks = taskList.ok
          ? taskList.data.data.filter(
              (t) => t.assigneeIds.length === 0 || t.assigneeIds.includes(teamMemberId)
            )
          : [];

        return {
          id: p.id,
          name: p.name,
          description: p.description ?? "Aucune description",
          icon: p.icon,
          team_members: projectMembers,
          tasks: myTasks.map(toUiTask),
        };
      })
    );

    return { success: true, projects: enriched };
  } catch (e) {
    console.error("[getProjectsWithTasksForTeamMember]", e);
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── assignTaskToSelf / unassignTaskFromSelf ─────────────────────────────

export async function assignTaskToSelf(
  taskId: string,
  teamMemberId: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const actor = await currentActor();
    const current = await tasksCore.get(actor, taskId);
    if (!current.ok) return { success: false, error: current.message };
    if (current.data.assigneeIds.includes(teamMemberId))
      return { success: false, error: "Vous êtes déjà assigné à cette tâche." };

    const next = [...current.data.assigneeIds, teamMemberId];
    const res = await tasksCore.assign(actor, { taskId, memberIds: next });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[assignTaskToSelf]", e);
    return { success: false, error: "Erreur lors de l'assignation." };
  }
}

export async function unassignTaskFromSelf(
  taskId: string,
  teamMemberId: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const actor = await currentActor();
    const current = await tasksCore.get(actor, taskId);
    if (!current.ok) return { success: false, error: current.message };
    if (!current.data.assigneeIds.includes(teamMemberId))
      return { success: false, error: "Vous n'êtes pas assigné à cette tâche." };

    const next = current.data.assigneeIds.filter((id) => id !== teamMemberId);
    // tasksCore.assign exige >=1. Si on vide tout, on passe par update().
    if (next.length === 0) {
      const upd = await tasksCore.update(actor, taskId, { assigneeIds: [] });
      if (!upd.ok) return { success: false, error: upd.message };
      revalidatePath("/dashboard/teams");
      revalidatePath("/dashboard/tasks");
      return { success: true, task: toUiTask(upd.data) };
    }
    const res = await tasksCore.assign(actor, { taskId, memberIds: next });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[unassignTaskFromSelf]", e);
    return { success: false, error: "Erreur lors de la désassignation." };
  }
}

// ── updateTaskStatus (kanban drag-drop) ─────────────────────────────────

export async function updateTaskStatus(
  taskId: string,
  newStatus: "à faire" | "en cours" | "review" | "terminée"
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const actor = await currentActor();
    const en = STATUS_FR_TO_EN[newStatus];
    const res = await tasksCore.changeStatus(actor, { taskId, status: en });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[updateTaskStatus]", e);
    return { success: false, error: "Erreur lors de la mise à jour du statut." };
  }
}

// ── getTeamsForAssignment ───────────────────────────────────────────────

export async function getTeamsForAssignment(): Promise<{
  success: boolean;
  teams?: TeamMember[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await members.list(actor, { limit: 100 });
    if (!res.ok) return { success: false, error: res.message };
    return {
      success: true,
      teams: res.data.data.map((m) => ({ id: m.id, full_name: m.fullName })),
    };
  } catch (e) {
    console.error("[getTeamsForAssignment]", e);
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}
