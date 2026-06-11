"use server";

import { prisma } from "./prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

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
  extra_message: string | null;
  submitted_at: Date;
  project_name: string;
  project_icon?: string;
};

export type ProjectSimple = {
  id: number;
  name: string | null;
};

// Type pour la pagination
export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  projectId?: number;
  dateFilter?: string; // "today", "week", "month"
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Get Rapports Data (avec pagination) ──────────────────────────────────────

export async function getRapportsData(
  params?: PaginationParams
): Promise<PaginatedResult<RapportWithDetails> & { roles: string[]; projects: ProjectSimple[] }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const search = params?.search;
  const role = params?.role;
  const projectId = params?.projectId;
  const dateFilter = params?.dateFilter;

  const session = await auth();
  if (!session) redirect("/login");

  // ✅ WHERE clause avec nested relations
  type WhereClause = {
    team?: {
      OR?: Array<{
        first_name?: { contains: string; mode: "insensitive" };
        last_name?: { contains: string; mode: "insensitive" };
      }>;
      users?: {
        some: {
          role?: string;
        };
      };
    };
    project_id?: number;
    created_at?: {
      gte?: Date;
      lt?: Date;
    };
  };

  const where: WhereClause = {};

  // Filtre par projet
  if (projectId) {
    where.project_id = projectId;
  }

  // Filtre par recherche (nom) OU rôle - utiliser OR pour combiner les conditions
  if (search) {
    where.team = {
      OR: [
        { first_name: { contains: search, mode: "insensitive" as const } },
        { last_name: { contains: search, mode: "insensitive" as const } },
      ],
    };
  }

  // Filtre par rôle via team.users - doit être combiné avec search si présent
  if (role) {
    if (where.team) {
      // Si on a déjà un filtre team (search), on ajoute users avec AND implicite
      where.team.users = {
        some: {
          role: role,
        },
      };
    } else {
      // Sinon on crée un filtre team uniquement pour le rôle
      where.team = {
        users: {
          some: {
            role: role,
          },
        },
      };
    }
  }

  // Filtre par date
  if (dateFilter) {
    if (dateFilter === "today") {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Début du jour actuel en UTC
      where.created_at = { gte: today };
    } else if (dateFilter === "week") {
      // Début de la semaine courante (lundi à 00:00:00 UTC)
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, on recule de 6 jours
      const monday = new Date(now);
      monday.setUTCDate(monday.getUTCDate() - daysToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      where.created_at = { gte: monday };
    } else if (dateFilter === "month") {
      // Début du mois courant (1er jour à 00:00:00 UTC)
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      where.created_at = { gte: monthStart };
    }
  }

  // ✅ COUNT avec les mêmes filtres (côté DB)
  const total = await prisma.rapports.count({ where });

  // ✅ FETCH avec pagination Prisma (skip/take)
  const rapportsData = await prisma.rapports.findMany({
    where,
    include: {
      team: {
        include: {
          users: true,
        },
      },
      project: true,
    },
    orderBy: {
      created_at: "desc",
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Transform data
  const reports: RapportWithDetails[] = rapportsData.map((r) => {
    const user = r.team?.users[0];
    return {
      id: r.id,
      team_id: r.team_id,
      project_id: r.project_id,
      full_name: `${r.team?.first_name || ""} ${r.team?.last_name || ""}`.trim(),
      role: user?.role ?? "Membre",
      built: r.work_built,
      working_built: r.working_built,
      blocked: r.broken_features,
      validated_learning: r.validated_learning,
      needed_learning: r.needed_learning,
      tomorrow_build: r.tomorrow_build,
      extra_message: r.extra_message,
      submitted_at: r.created_at,
      project_name: r.project?.name ?? "Sans projet",
      project_icon: r.project?.icon ?? undefined,
    };
  });

  // Récupérer les projets pour les filtres
  const projectsData = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Récupérer les rôles distincts (pour les filtres)
  const allRoles = await prisma.users.findMany({
    select: { role: true },
    distinct: ["role"],
    where: { role: { not: null } },
  });

  const roles = allRoles.map((u) => u.role).filter(Boolean) as string[];
  const projects: ProjectSimple[] = projectsData.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return {
    data: reports,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    roles,
    projects,
  };
}
