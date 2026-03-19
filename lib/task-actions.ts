"use server";

import { prisma } from "./prisma";
import { notifyTaskAssigned } from "./notify-task";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPermissions } from "@/lib/permissions";

// ── Helper: Vérifier authentification et permissions ─────────────────────────

async function requireTeamManagement() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userRole = (session.user as { role?: string }).role;
  const permissions = getPermissions(userRole ?? null);

  if (!permissions.canManageTasks) {
    throw new Error("Non autorisé: permissions insuffisantes");
  }

  return session.user;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Task = {
  id: number;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  project_id: number | null;
  assigned_to: number[] | null;
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
  project_id?: number | null;
  assigned_to?: number[] | null;
  due_date?: string | null;
};

export type UpdateTaskData = Partial<CreateTaskData>;

export type TaskResult = { success: true; task: Task } | { success: false; error: string };

// Type pour la pagination
export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  projectId?: number;
  assignedTo?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Helper: normaliser assigned_to — Neon retourne "{1,2}" en prod ────────────

function parseAssignedTo(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const arr = raw.map(Number).filter(Boolean);
    return arr.length ? arr : null;
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[{}]/g, "").trim();
    if (!cleaned) return null;
    const arr = cleaned.split(",").map(Number).filter(Boolean);
    return arr.length ? arr : null;
  }
  return null;
}

// ── Helper: sérialiser due_date ───────────────────────────────────────────────

function serializeDueDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) return `${match[1]} ${match[2]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`;
    return null;
  }
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear();
    const mo = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const d = String(raw.getUTCDate()).padStart(2, "0");
    const h = String(raw.getUTCHours()).padStart(2, "0");
    const mi = String(raw.getUTCMinutes()).padStart(2, "0");
    return `${y}-${mo}-${d} ${h}:${mi}`;
  }
  return null;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateTask(data: CreateTaskData): { valid: true } | { valid: false; error: string } {
  const title = data.title?.trim();
  if (!title || title.length < 2)
    return { valid: false, error: "Le titre doit contenir au moins 2 caractères." };
  if (title.length > 100)
    return { valid: false, error: "Le titre est trop long (100 caractères max)." };
  return { valid: true };
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskData): Promise<TaskResult> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    const validation = validateTask(data);
    if (!validation.valid) return { success: false, error: validation.error };

    // Convertir due_date en format ISO-8601 valide pour Prisma
    let dueDate: Date | null = null;
    if (data.due_date) {
      // Format attendu: "YYYY-MM-DD HH:MM"
      const match = data.due_date.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
      if (match) {
        const [, datePart, timePart] = match;
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);
        dueDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
      } else {
        dueDate = new Date(data.due_date);
      }
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }

    const task = await prisma.tasks.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || "",
        status: data.status || "à faire",
        priority: data.priority || "medium",
        project_id: data.project_id || null,
        assigned_to: data.assigned_to || [],
        due_date: dueDate,
      },
    });

    const enriched = await enrichTask(task);
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");

    // Notifier les membres assignés via Slack
    if (enriched.assigned_to?.length) {
      notifyTaskAssigned({
        assignedIds: enriched.assigned_to,
        taskTitle: enriched.title,
        taskDescription: enriched.description,
        projectName: enriched.project_name,
        dueDate: enriched.due_date,
      }).catch((err) => console.error("[createTask] Slack notify error:", err));
    }

    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[createTask]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la création de la tâche." };
  }
}

// ── READ (GET ONE) ────────────────────────────────────────────────────────────

export async function getTask(id: number): Promise<TaskResult> {
  try {
    const task = await prisma.tasks.findUnique({
      where: { id },
    });
    if (!task) return { success: false, error: "Tâche non trouvée." };
    return { success: true, task: await enrichTask(task) };
  } catch (err: unknown) {
    console.error("[getTask]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération de la tâche." };
  }
}

// ── READ (GET ALL) ────────────────────────────────────────────────────────────

export async function getTasks(
  params?: PaginationParams
): Promise<PaginatedResult<Task> | { success: boolean; tasks?: Task[]; error?: string }> {
  // Si pas de params, retourner l'ancienne version pour compatibilité
  if (!params) {
    const tasks = await prisma.tasks.findMany({
      orderBy: { created_at: "desc" },
    });
    const enriched = await Promise.all(tasks.map((t) => enrichTask(t)));
    return { success: true, tasks: enriched };
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const search = params.search;
  const status = params.status;
  const priority = params.priority;
  const projectId = params.projectId;
  const assignedTo = params.assignedTo;

  // Construire les filtres WHERE
  type WhereClause = {
    OR?: Array<{
      title?: { contains: string; mode: "insensitive" };
      description?: { contains: string; mode: "insensitive" };
    }>;
    status?: string;
    priority?: string;
    project_id?: number;
    assigned_to?: { has: number };
  };
  const where: WhereClause = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (projectId) {
    where.project_id = projectId;
  }

  if (assignedTo) {
    where.assigned_to = { has: assignedTo };
  }

  // Récupérer le total
  const total = await prisma.tasks.count({ where });

  // Récupérer les tâches paginées
  const tasks = await prisma.tasks.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const enriched = await Promise.all(tasks.map((t) => enrichTask(t)));

  return {
    data: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function updateTask(id: number, data: UpdateTaskData): Promise<TaskResult> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    const existing = await prisma.tasks.findUnique({
      where: { id },
    });
    if (!existing) return { success: false, error: "Tâche non trouvée." };

    const mergedData: CreateTaskData = {
      title: data.title ?? existing.title ?? "Sans titre",
      description: data.description ?? existing.description ?? undefined,
      status:
        data.status ??
        (existing.status as "à faire" | "en cours" | "review" | "terminée" | null) ??
        undefined,
      priority:
        data.priority ?? (existing.priority as "low" | "medium" | "high" | null) ?? undefined,
      project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
      assigned_to:
        data.assigned_to !== undefined ? data.assigned_to : parseAssignedTo(existing.assigned_to),
      due_date:
        data.due_date !== undefined
          ? data.due_date
          : existing.due_date
            ? serializeDueDate(existing.due_date) // ✅ au lieu de .toISOString().split("T")[0]
            : null,
    };

    const validation = validateTask(mergedData);
    if (!validation.valid) return { success: false, error: validation.error };

    // Convertir due_date en format ISO-8601 valide pour Prisma
    let dueDate: Date | null = null;
    if (mergedData.due_date) {
      const match = mergedData.due_date.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/);
      if (match) {
        const [, datePart, timePart] = match;
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);
        dueDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
      } else {
        dueDate = new Date(mergedData.due_date);
      }
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }

    const updated = await prisma.tasks.update({
      where: { id },
      data: {
        title: mergedData.title!.trim(),
        description: mergedData.description?.trim() || "",
        status: mergedData.status!,
        priority: mergedData.priority!,
        project_id: mergedData.project_id ?? null,
        assigned_to: mergedData.assigned_to || [],
        due_date: dueDate,
      },
    });

    const enriched = await enrichTask(updated);
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");

    // Notifier uniquement les membres nouvellement assignés
    const prevIds = parseAssignedTo(existing.assigned_to) ?? [];
    const newIds = enriched.assigned_to ?? [];
    const addedIds = newIds.filter((id) => !prevIds.includes(id));
    if (addedIds.length) {
      notifyTaskAssigned({
        assignedIds: addedIds,
        taskTitle: enriched.title,
        taskDescription: enriched.description,
        projectName: enriched.project_name,
        dueDate: enriched.due_date,
      }).catch((err) => console.error("[updateTask] Slack notify error:", err));
    }

    return { success: true, task: enriched };
  } catch (err: unknown) {
    console.error("[updateTask]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la modification de la tâche." };
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deleteTask(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    await prisma.tasks.delete({
      where: { id },
    });
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteTask]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la suppression de la tâche." };
  }
}

// ── Helper: Enrichir une tâche ────────────────────────────────────────────────

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

async function enrichTask(task: PrismaTask): Promise<Task> {
  let assigned_to_names: string[] | undefined;
  let project_name: string | undefined;

  const assignedIds = parseAssignedTo(task.assigned_to);

  if (assignedIds?.length) {
    try {
      const members = await prisma.teams.findMany({
        where: {
          id: { in: assignedIds },
        },
        select: {
          first_name: true,
          last_name: true,
        },
        orderBy: {
          first_name: "asc",
        },
      });
      if (members.length) {
        assigned_to_names = members.map((m) => `${m.first_name} ${m.last_name}`);
      }
    } catch (err) {
      console.error("[enrichTask] Error fetching assigned members", err);
    }
  }

  if (task.project_id) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: task.project_id },
        select: { name: true },
      });
      if (project) project_name = project.name || undefined;
    } catch (err) {
      console.error("[enrichTask] Error fetching project", err);
    }
  }

  return {
    id: task.id,
    title: task.title ?? "",
    description: task.description ?? "",
    status: (task.status as "à faire" | "en cours" | "review" | "terminée") ?? "à faire",
    priority: (task.priority as "low" | "medium" | "high") ?? "medium",
    project_id: task.project_id,
    assigned_to: assignedIds,
    due_date: serializeDueDate(task.due_date),
    created_at:
      typeof task.created_at === "string" ? task.created_at : task.created_at.toISOString(),
    assigned_to_names,
    project_name,
  };
}

// ── GET TEAMS ─────────────────────────────────────────────────────────────────

export async function getTeamsForAssignment(): Promise<{
  success: boolean;
  teams?: Array<{ id: number; full_name: string }>;
  error?: string;
}> {
  try {
    const teams = await prisma.teams.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
      orderBy: {
        first_name: "asc",
      },
    });
    return {
      success: true,
      teams: teams.map((t) => ({
        id: t.id,
        full_name: `${t.first_name} ${t.last_name}`,
      })),
    };
  } catch (err: unknown) {
    console.error("[getTeamsForAssignment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des équipes." };
  }
}

// ── GET PROJECTS ──────────────────────────────────────────────────────────────

export async function getProjectsForTasks(): Promise<{
  success: boolean;
  projects?: Array<{ id: number; name: string }>;
  error?: string;
}> {
  try {
    const projectsResult = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    const projects = projectsResult.map((p) => ({
      id: p.id,
      name: p.name || "Sans nom",
    }));
    return { success: true, projects };
  } catch (err: unknown) {
    console.error("[getProjectsForTasks]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des projets." };
  }
}

// ── GET TEAM MEMBERS BY PROJECT ───────────────────────────────────────────────

export async function getTeamMembersByProject(projectId: number): Promise<{
  success: boolean;
  members?: Array<{ id: number; full_name: string }>;
  error?: string;
}> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { team_ids: true },
    });

    if (!project) return { success: true, members: [] };

    const teamIds = parseAssignedTo(project.team_ids);
    if (!teamIds?.length) return { success: true, members: [] };

    const result = await prisma.teams.findMany({
      where: {
        id: { in: teamIds },
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

    return {
      success: true,
      members: result.map((t) => ({
        id: t.id,
        full_name: `${t.first_name} ${t.last_name}`,
      })),
    };
  } catch (err: unknown) {
    console.error("[getTeamMembersByProject]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des membres." };
  }
}

// ── GET TASKS BY MEMBER ───────────────────────────────────────────────────────

export async function getTasksByMember(memberId: number): Promise<{
  success: boolean;
  tasks?: Task[];
  error?: string;
}> {
  try {
    const result = await prisma.tasks.findMany({
      where: {
        assigned_to: { has: memberId },
        status: { not: "done" },
      },
      include: {
        project: {
          select: { name: true },
        },
      },
      orderBy: [{ due_date: "asc" }],
    });
    const enriched = await Promise.all(result.map((t) => enrichTask(t)));
    return { success: true, tasks: enriched };
  } catch (err: unknown) {
    console.error("[getTasksByMember]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des tâches." };
  }
}
