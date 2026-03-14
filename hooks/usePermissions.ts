"use client";

import { useAuth } from "./useAuth";
import {
  getPermissions,
  canViewReports,
  canEditReports,
  canDeleteReports,
  canViewTeam,
  canManageTeam,
  canAccessDashboard,
  isSuperAdmin,
  isTeamManager,
  isTeam,
  type Permission,
} from "@/lib/permissions";

export interface UsePermissionsReturn extends Permission {
  role: string | null;
  isSuperAdmin: boolean;
  isTeamManager: boolean;
  isTeam: boolean;
}

/**
 * Hook pour vérifier les permissions de l'utilisateur connecté
 * @returns {UsePermissionsReturn} Permissions et rôle
 */
export function usePermissions(): UsePermissionsReturn {
  const { role } = useAuth();

  return {
    role,
    canViewReports:     canViewReports(role),
    canEditReports:     canEditReports(role),
    canDeleteReports:   canDeleteReports(role),
    canViewTeam:        canViewTeam(role),
    canManageTeam:      canManageTeam(role),
    canAccessDashboard: canAccessDashboard(role),
    isSuperAdmin:       isSuperAdmin(role),
    isTeamManager:      isTeamManager(role),
    isTeam:             isTeam(role),
  };
}