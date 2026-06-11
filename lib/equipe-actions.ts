"use server";

/**
 * Wrapper Server Action — page Équipe.
 * Délègue à lib/core/members puis adapte le shape vers TeamMemberWithUser
 * pour ne pas casser l'UI existante.
 */

import { members } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";

// ── Types historiques préservés (consommés par l'UI) ─────────────────────

export type TeamMemberWithUser = {
  id: string; // ex-number, maintenant cuid
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: Date;
  user_id: string | null;
  email: string | null;
  role: string | null;
  user_created_at: Date | null;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  allowedTeamIds?: string[]; // ex-number[], maintenant cuid[]
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── getTeamsData ─────────────────────────────────────────────────────────

export async function getTeamsData(
  params?: PaginationParams
): Promise<PaginatedResult<TeamMemberWithUser> & { roles: string[] }> {
  const actor = await currentActor();
  const res = await members.list(actor, {
    page: params?.page,
    limit: params?.limit,
    search: params?.search,
    role: params?.role as "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER" | undefined,
  });
  if (!res.ok) throw new Error(res.message);

  // Filtre supplémentaire allowedTeamIds (sécurité PM)
  let rows = res.data.data;
  if (params?.allowedTeamIds) {
    const allowed = new Set(params.allowedTeamIds);
    rows = rows.filter((m) => allowed.has(m.id));
  }

  const data: TeamMemberWithUser[] = rows.map((m) => ({
    id: m.id,
    first_name: m.firstName,
    last_name: m.lastName,
    full_name: m.fullName,
    phone: m.phone,
    age: m.age,
    is_boss: m.isBoss,
    slack_id: m.slackId,
    created_at: m.createdAt,
    user_id: m.hasAuth ? m.id : null,
    email: m.email,
    role: m.role,
    user_created_at: m.hasAuth ? m.createdAt : null,
  }));

  const roles = [...new Set(data.map((m) => m.role).filter(Boolean))] as string[];

  return {
    data,
    total: params?.allowedTeamIds ? data.length : res.data.total,
    page: res.data.page,
    limit: res.data.limit,
    totalPages: res.data.totalPages,
    roles,
  };
}
