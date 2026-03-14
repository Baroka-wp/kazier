"use server";

import { auth } from "@/auth";
import {
  canEditReports,
  canDeleteReports,
  canManageTeam,
  type Permission,
} from "@/lib/permissions";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Wrapper pour vérifier les permissions avant d'exécuter une server action
 * Utilisé pour les actions qui modifient les données
 */
export async function withAuth<T>(
  permission: keyof Permission,
  fn: (role: string | null) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await auth();

    if (!session) {
      return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
    }

    const role = (session.user as { role?: string })?.role;

    // Vérifier la permission
    const hasPermission = getPermissionValue(permission, role ?? null);
    if (!hasPermission) {
      return { success: false, error: "Accès refusé", code: "FORBIDDEN" };
    }

    // Exécuter la fonction
    const data = await fn(role ?? null);
    return { success: true, data };
  } catch (err: unknown) {
    console.error("[withAuth]", err instanceof Error ? err.message : String(err));
    return { success: false, error: err instanceof Error ? err.message : "Erreur serveur" };
  }
}

/**
 * Helper pour obtenir la valeur d'une permission
 */
function getPermissionValue(permission: keyof Permission, role: string | null): boolean {
  switch (permission) {
    case "canViewReports":
      return role === "SA" || role === "TM";
    case "canEditReports":
      return canEditReports(role);
    case "canDeleteReports":
      return canDeleteReports(role);
    case "canViewTeam":
      return role === "SA" || role === "TM";
    case "canManageTeam":
      return canManageTeam(role);
    case "canAccessDashboard":
      return role === "SA" || role === "TM";
    default:
      return false;
  }
}

/**
 * Wrapper simplifié pour les actions de suppression de rapports
 */
export async function withEditReportPermission<T>(
  fn: (role: string | null) => Promise<T>
): Promise<ActionResult<T>> {
  return withAuth("canEditReports", fn);
}

/**
 * Wrapper simplifié pour les actions de suppression de rapports
 */
export async function withDeleteReportPermission<T>(
  fn: (role: string | null) => Promise<T>
): Promise<ActionResult<T>> {
  return withAuth("canDeleteReports", fn);
}

/**
 * Wrapper simplifié pour les actions de gestion de l'équipe
 */
export async function withManageTeamPermission<T>(
  fn: (role: string | null) => Promise<T>
): Promise<ActionResult<T>> {
  return withAuth("canManageTeam", fn);
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
export async function checkAuth(): Promise<ActionResult<string | null>> {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Non authentifié", code: "UNAUTHENTICATED" };
  }
  return { success: true, data: (session.user as { role?: string })?.role ?? null };
}