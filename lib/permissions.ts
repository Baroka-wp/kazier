// ── Rôles applicatifs ───────────────────────────────────────────────────
//
// Helpers UI-side : utilisés par les pages/composants pour montrer/cacher
// des boutons. Pour les permissions runtime (Server Actions, MCP), c'est
// lib/core/permissions.ts qui fait foi.
//
// On accepte la nomenclature V1 (SA/TM/T) ET V2 (SUPER_ADMIN/PROJECT_MANAGER/
// MEMBER) pour la transition. Une fois les JWT renouvelés, on pourra
// supprimer les alias V1.

export type Role = "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER";

export interface Permission {
  canViewReports: boolean;
  canEditReports: boolean;
  canDeleteReports: boolean;
  canViewTeam: boolean;
  canManageTeam: boolean;
  canManageTasks: boolean;
  canAccessDashboard: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  SUPER_ADMIN: {
    canViewReports: true,
    canEditReports: true,
    canDeleteReports: true,
    canViewTeam: true,
    canManageTeam: true,
    canManageTasks: true,
    canAccessDashboard: true,
  },
  PROJECT_MANAGER: {
    canViewReports: true,
    canEditReports: false,
    canDeleteReports: false,
    canViewTeam: true,
    canManageTeam: true,
    canManageTasks: true,
    canAccessDashboard: true,
  },
  MEMBER: {
    canViewReports: false,
    canEditReports: false,
    canDeleteReports: false,
    canViewTeam: false,
    canManageTeam: false,
    canAccessDashboard: false,
    canManageTasks: false,
  },
};

function normalize(role: string | null | undefined): Role {
  switch (role) {
    case "SUPER_ADMIN":
    case "SA":
      return "SUPER_ADMIN";
    case "PROJECT_MANAGER":
    case "TM":
      return "PROJECT_MANAGER";
    case "MEMBER":
    case "T":
    default:
      return "MEMBER";
  }
}

export function getPermissions(role: string | null | undefined): Permission {
  return ROLE_PERMISSIONS[normalize(role)];
}

export const canViewReports = (r: string | null | undefined) => getPermissions(r).canViewReports;
export const canEditReports = (r: string | null | undefined) => getPermissions(r).canEditReports;
export const canDeleteReports = (r: string | null | undefined) =>
  getPermissions(r).canDeleteReports;
export const canViewTeam = (r: string | null | undefined) => getPermissions(r).canViewTeam;
export const canManageTeam = (r: string | null | undefined) => getPermissions(r).canManageTeam;
export const canAccessDashboard = (r: string | null | undefined) =>
  getPermissions(r).canAccessDashboard;
export const canManageTasks = (r: string | null | undefined) => getPermissions(r).canManageTasks;

export const isSuperAdmin = (r: string | null | undefined) => normalize(r) === "SUPER_ADMIN";
export const isTeamManager = (r: string | null | undefined) => normalize(r) === "PROJECT_MANAGER";
export const isTeam = (r: string | null | undefined) => normalize(r) === "MEMBER";
