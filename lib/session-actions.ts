"use server";

import { auth } from "@/auth";
import {
  canViewReports,
  canEditReports,
  canDeleteReports,
  canViewTeam,
  canManageTeam,
  canAccessDashboard,
  canManageTasks,
  isSuperAdmin,
  isTeamManager,
  isTeam,
  type Permission,
} from "@/lib/permissions";

// ── Type retourné — miroir exact de UsePermissionsReturn du hook ──────────────

export interface SessionPermissions extends Permission {
  role: string | null;
  isSuperAdmin: boolean;
  isTeamManager: boolean;
  isTeam: boolean;
  // Infos utilisateur
  teamMemberId: number | null;
  userId: string | null;
}

// Permissions par défaut — aucun accès (utilisateur non authentifié)
const NULL_PERMISSIONS: SessionPermissions = {
  role: null,
  teamMemberId: null,
  userId: null,
  canViewReports: false,
  canEditReports: false,
  canDeleteReports: false,
  canViewTeam: false,
  canManageTeam: false,
  canAccessDashboard: false,
  canManageTasks: false,
  isSuperAdmin: false,
  isTeamManager: false,
  isTeam: false,
};

/**
 * Retourne les permissions de la session serveur en cours.
 *
 * Utilisation dans les composants client :
 *   const perms = await getSessionPermissions();
 *
 * Utilisation dans les server actions (vérification avant mutation) :
 *   const perms = await getSessionPermissions();
 *   if (!perms.canManageTasks) throw new Error("Non autorisé");
 *
 * Même structure que usePermissions() côté client — une seule source de vérité.
 */
export async function getSessionPermissions(): Promise<SessionPermissions> {
  const session = await auth();
  if (!session?.user) return NULL_PERMISSIONS;

  const user = session.user as {
    role?: string;
    id?: string;
    team_id?: string;
  };

  const role = user.role ?? null;

  return {
    role,
    teamMemberId: user.team_id ? parseInt(user.team_id) : user.id ? parseInt(user.id) : null,
    userId: user.id ?? null,
    canViewReports: canViewReports(role),
    canEditReports: canEditReports(role),
    canDeleteReports: canDeleteReports(role),
    canViewTeam: canViewTeam(role),
    canManageTeam: canManageTeam(role),
    canAccessDashboard: canAccessDashboard(role),
    canManageTasks: canManageTasks(role),
    isSuperAdmin: isSuperAdmin(role),
    isTeamManager: isTeamManager(role),
    isTeam: isTeam(role),
  };
}

/**
 * Version qui throw si non authentifié ou permission manquante.
 * À utiliser en tête de chaque server action pour sécuriser les mutations.
 *
 * Exemples :
 *   await requirePermission("canManageTasks");   // SA + TM uniquement
 *   await requirePermission("canDeleteReports"); // SA uniquement
 *   await requirePermission("canAccessDashboard");
 */
export async function requirePermission(permission: keyof Permission): Promise<SessionPermissions> {
  const perms = await getSessionPermissions();

  if (!perms.role) {
    throw new Error("Non authentifié");
  }

  if (!perms[permission]) {
    throw new Error(`Non autorisé — permission requise : ${permission}`);
  }

  return perms;
}
