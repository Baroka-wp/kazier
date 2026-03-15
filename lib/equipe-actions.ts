"use server";

import { prisma } from "./prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeamMemberWithUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: Date;
  user_id: number | null;
  email: string | null;
  role: string | null;
  user_created_at: Date | null;
};

export type TeamsDataResult = {
  members: TeamMemberWithUser[];
  totalMembers: number;
  bosses: number;
  withAccount: number;
  withoutAccount: number;
  roles: string[];
};

// Type pour la pagination
export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Get Teams Data (avec pagination) ─────────────────────────────────────────

export async function getTeamsData(
  params?: PaginationParams
): Promise<PaginatedResult<TeamMemberWithUser> & { roles: string[] }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const search = params?.search;
  const role = params?.role;

  // Construire les filtres WHERE
  type WhereClause = {
    OR?: Array<{
      first_name?: { contains: string; mode: "insensitive" };
      last_name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
    }>;
    role?: string;
  };
  const where: WhereClause = {};

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: "insensitive" as const } },
      { last_name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
    ];
  }

  if (role) {
    where.role = role;
  }

  // Récupérer le total
  const total = await prisma.teams.count({ where });

  // Récupérer les membres paginés
  const teamsData = await prisma.teams.findMany({
    where,
    include: {
      users: true,
    },
    orderBy: {
      created_at: "desc",
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Transform to match expected format
  const members: TeamMemberWithUser[] = teamsData.map((t) => {
    const user = t.users[0];
    return {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      full_name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
      phone: t.phone,
      age: t.age,
      is_boss: t.is_boss,
      slack_id: t.slack_id,
      created_at: t.created_at,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      user_created_at: user ? new Date() : null,
    };
  });

  const roles = [...new Set(members.map((m) => m.role).filter(Boolean))] as string[];

  return {
    data: members,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    roles,
  };
}

// ── Get Teams Data (ancienne version pour compatibilité) ─────────────────────

export async function getTeamsDataLegacy(): Promise<TeamsDataResult> {
  const teamsData = await prisma.teams.findMany({
    include: {
      users: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Transform to match expected format
  const members: TeamMemberWithUser[] = teamsData.map((t) => {
    const user = t.users[0]; // Get first user (if exists)
    return {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      full_name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
      phone: t.phone,
      age: t.age,
      is_boss: t.is_boss,
      slack_id: t.slack_id,
      created_at: t.created_at,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      user_created_at: user ? new Date() : null,
    };
  });

  const totalMembers = members.length;
  const bosses = members.filter((m) => m.is_boss).length;
  const withAccount = members.filter((m) => m.user_id !== null).length;
  const withoutAccount = totalMembers - withAccount;

  const roles = [...new Set(members.map((m) => m.role).filter(Boolean))] as string[];

  return { members, totalMembers, bosses, withAccount, withoutAccount, roles };
}
