"use client";

import { useSession } from "next-auth/react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  team_id: number | null;
  first_name: string | null;
  last_name: string | null;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  status: "authenticated" | "unauthenticated" | "loading";
  isLoading: boolean;
  role: string | null;
}

/**
 * Hook pour accéder à l'utilisateur connecté et son rôle
 * @returns {UseAuthReturn} User et status
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const user = session?.user as AuthUser | null;

  return {
    user,
    status: status as "authenticated" | "unauthenticated" | "loading",
    isLoading: status === "loading",
    role: user?.role ?? null,
  };
}
