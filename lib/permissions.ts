// ── Types des rôles ──────────────────────────────────────────────────────────

export type Role = "SA" | "TM" | "T"; // Super Admin, Team Manager, Team

export interface Permission {
  canViewReports: boolean;
  canEditReports: boolean;
  canDeleteReports: boolean;
  canViewTeam: boolean;
  canManageTeam: boolean;
  canManageTasks: boolean;
  canAccessDashboard: boolean;
}

// ── Matrice des permissions ───────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  SA: {
    // Super Admin - Accès complet
    canViewReports: true,
    canEditReports: true,
    canDeleteReports: true,
    canViewTeam: true,
    canManageTeam: true,
    canManageTasks: true,
    canAccessDashboard: true,
  },
  TM: {
    // Team Manager - Lecture seule
    canViewReports: true,
    canEditReports: false,
    canDeleteReports: false,
    canViewTeam: true,
    canManageTeam: true,
    canManageTasks: true,
    canAccessDashboard: true,
  },
  T: {
    // Team - Pas d'accès au dashboard (sauf teams)
    canViewReports: false,
    canEditReports: false,
    canDeleteReports: false,
    canViewTeam: false,
    canManageTeam: false,
    canAccessDashboard: false,
    canManageTasks: false,
  },
};

// ── Fonction pour obtenir les permissions d'un rôle ──────────────────────────

export function getPermissions(role: string | null | undefined): Permission {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return ROLE_PERMISSIONS.T; // Default: pas d'accès
  }
  return ROLE_PERMISSIONS[role as Role];
}

// ── Fonctions helper pour les vérifications courantes ──────────────────────────

export function canViewReports(role: string | null | undefined): boolean {
  return getPermissions(role).canViewReports;
}

export function canEditReports(role: string | null | undefined): boolean {
  return getPermissions(role).canEditReports;
}

export function canDeleteReports(role: string | null | undefined): boolean {
  return getPermissions(role).canDeleteReports;
}

export function canViewTeam(role: string | null | undefined): boolean {
  return getPermissions(role).canViewTeam;
}

export function canManageTeam(role: string | null | undefined): boolean {
  return getPermissions(role).canManageTeam;
}

export function canAccessDashboard(role: string | null | undefined): boolean {
  return getPermissions(role).canAccessDashboard;
}

export function canManageTasks(role: string | null | undefined): boolean {
  return getPermissions(role).canManageTasks;
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "SA";
}

export function isTeamManager(role: string | null | undefined): boolean {
  return role === "TM";
}

export function isTeam(role: string | null | undefined): boolean {
  return role === "T";
}
