"use server";

/**
 * Wrappers Server Actions — pages Tasks.
 * Délègue à lib/core/tasks. Mapping FR↔EN aux frontières (l'UI utilise
 * "à faire/en cours/review/terminée" et "low/medium/high").
 */

import { tasks as tasksCore, projects as projectsCore, members as membersCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

// ── Types historiques préservés ──────────────────────────────────────────

export type Task = {
  id: string;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  project_id: string | null;
  assigned_to: string[] | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  assigned_to_names?: string[];
  project_name?: string;
};

export type CreateTaskData = {
  title: string;
  description?: string;
  status?: "à faire" | "en cours" | "review" | "terminée";
  priority?: "low" | "medium" | "high";
  project_id?: string | null;
  assigned_to?: string[] | null;
  start_date?: string | null;
  due_date?: string | null;
};

export type UpdateTaskData = Partial<CreateTaskData>;

export type TaskResult = { success: true; task: Task } | { success: false; error: string };

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  assignedTo?: string;
  allowedProjectIds?: string[];
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Mappings FR↔EN ───────────────────────────────────────────────────────

const STATUS_FR_TO_EN: Record<NonNullable<Task["status"]>, "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
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
  CANCELLED: "terminée",
};

function toUiTask(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  assigneeIds: string[];
  assigneeNames: string[];
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
}): Task {
  const fmt = (d: Date | null) => {
    if (!d) return null;
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}-${mo}-${da} ${h}:${mi}`;
  };
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: STATUS_EN_TO_FR[t.status] ?? "à faire",
    priority: (t.priority.toLowerCase() as Task["priority"]) ?? "medium",
    project_id: t.projectId,
    assigned_to: t.assigneeIds.length ? t.assigneeIds : null,
    start_date: fmt(t.startDate),
    due_date: fmt(t.dueDate),
    created_at: t.createdAt.toISOString(),
    assigned_to_names: t.assigneeNames,
    project_name: t.projectName ?? undefined,
  };
}

// ── notifyTaskReview — préservé pour compat (no-op : géré par events) ──

export async function notifyTaskReview(_task: Task): Promise<void> {
  // Le notifier Slack écoute désormais l'event task.status_changed → REVIEW
  // émis par tasks.changeStatus. Cette fonction reste exportée pour ne pas
  // casser d'éventuels imports résiduels mais ne fait plus rien.
  void _task;
}

// ── createTask ───────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskData): Promise<TaskResult> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.create(actor, {
      title: data.title,
      description: data.description,
      projectId: data.project_id ?? undefined,
      status: data.status ? STATUS_FR_TO_EN[data.status] : undefined,
      priority: data.priority ? (data.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH") : undefined,
      startDate: data.start_date ?? undefined,
      dueDate: data.due_date ?? undefined,
      assigneeIds: data.assigned_to ?? [],
    });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[createTask]", e);
    return { success: false, error: "Erreur lors de la création de la tâche." };
  }
}

// ── getTask ──────────────────────────────────────────────────────────────

export async function getTask(id: string): Promise<TaskResult> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.get(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[getTask]", e);
    return { success: false, error: "Erreur lors de la récupération de la tâche." };
  }
}

// ── getTasks ─────────────────────────────────────────────────────────────

export async function getTasks(
  params?: PaginationParams
): Promise<PaginatedResult<Task> | { success: boolean; tasks?: Task[]; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.list(actor, {
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      status: params?.status
        ? (STATUS_FR_TO_EN[params.status as Task["status"]] ?? undefined)
        : undefined,
      priority: params?.priority
        ? (params.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH")
        : undefined,
      projectId: params?.projectId,
      assigneeId: params?.assignedTo,
    });
    if (!res.ok) return { success: false, error: res.message };

    // allowedProjectIds : filtre côté wrapper si fourni
    let rows = res.data.data;
    if (params?.allowedProjectIds && params.allowedProjectIds.length > 0) {
      const allowed = new Set(params.allowedProjectIds);
      rows = rows.filter((t) => !t.projectId || allowed.has(t.projectId));
    }

    if (!params) {
      return { success: true, tasks: rows.map(toUiTask) };
    }
    return {
      data: rows.map(toUiTask),
      total: res.data.total,
      page: res.data.page,
      limit: res.data.limit,
      totalPages: res.data.totalPages,
    };
  } catch (e) {
    console.error("[getTasks]", e);
    return { success: false, error: "Erreur lors de la récupération des tâches." };
  }
}

// ── updateTask ───────────────────────────────────────────────────────────

export async function updateTask(id: string, data: UpdateTaskData): Promise<TaskResult> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.update(actor, id, {
      title: data.title,
      description: data.description,
      projectId: data.project_id ?? undefined,
      status: data.status ? STATUS_FR_TO_EN[data.status] : undefined,
      priority: data.priority ? (data.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH") : undefined,
      startDate: data.start_date ?? undefined,
      dueDate: data.due_date ?? undefined,
      assigneeIds: data.assigned_to ?? undefined,
    });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true, task: toUiTask(res.data) };
  } catch (e) {
    console.error("[updateTask]", e);
    return { success: false, error: "Erreur lors de la modification de la tâche." };
  }
}

// ── deleteTask ───────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.remove(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteTask]", e);
    return { success: false, error: "Erreur lors de la suppression de la tâche." };
  }
}

// ── getTeamsForAssignment ────────────────────────────────────────────────

export async function getTeamsForAssignment(): Promise<{
  success: boolean;
  teams?: Array<{ id: string; full_name: string }>;
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await membersCore.list(actor, { limit: 100 });
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

// ── getProjectsForTasks ──────────────────────────────────────────────────

export async function getProjectsForTasks(): Promise<{
  success: boolean;
  projects?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await projectsCore.list(actor, { limit: 100 });
    if (!res.ok) return { success: false, error: res.message };
    return {
      success: true,
      projects: res.data.data.map((p) => ({ id: p.id, name: p.name })),
    };
  } catch (e) {
    console.error("[getProjectsForTasks]", e);
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── getTeamMembersByProject ──────────────────────────────────────────────

export async function getTeamMembersByProject(projectId: string): Promise<{
  success: boolean;
  members?: Array<{ id: string; first_name: string; last_name: string; full_name: string }>;
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await projectsCore.get(actor, projectId);
    if (!res.ok) return { success: false, error: res.message };
    return {
      success: true,
      members: res.data.members.map((m) => {
        const [first, ...rest] = m.fullName.split(" ");
        return {
          id: m.memberId,
          first_name: first || "",
          last_name: rest.join(" "),
          full_name: m.fullName,
        };
      }),
    };
  } catch (e) {
    console.error("[getTeamMembersByProject]", e);
    return { success: false, error: "Erreur lors de la récupération des membres." };
  }
}

// ── getOpenTasksForMember ────────────────────────────────────────────────

export async function getOpenTasksForMember(memberId: string): Promise<{
  success: boolean;
  tasks?: Task[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.list(actor, { assigneeId: memberId, limit: 100 });
    if (!res.ok) return { success: false, error: res.message };
    // Filtrer : exclure DONE et CANCELLED
    const open = res.data.data.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
    return { success: true, tasks: open.map(toUiTask) };
  } catch (e) {
    console.error("[getOpenTasksForMember]", e);
    return { success: false, error: "Erreur lors de la récupération des tâches." };
  }
}
