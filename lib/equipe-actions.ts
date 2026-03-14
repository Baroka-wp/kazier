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

// ── Get Teams Data ────────────────────────────────────────────────────────────

export async function getTeamsData(): Promise<TeamsDataResult> {
  const teamsData = await prisma.teams.findMany({
    include: {
      users: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Transform to match expected format
  const members: TeamMemberWithUser[] = teamsData.map(t => {
    const user = t.users[0]; // Get first user (if exists)
    return {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      full_name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
      phone: t.phone,
      age: t.age,
      is_boss: t.is_boss,
      slack_id: t.slack_id,
      created_at: t.created_at,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      user_created_at: user ? new Date() : null
    };
  });

  const totalMembers = members.length;
  const bosses = members.filter(m => m.is_boss).length;
  const withAccount = members.filter(m => m.user_id !== null).length;
  const withoutAccount = totalMembers - withAccount;

  const roles = [
    ...new Set(members.map(m => m.role).filter(Boolean)),
  ] as string[];

  return { members, totalMembers, bosses, withAccount, withoutAccount, roles };
}
