/**
 * Pont entre NextAuth et lib/core.
 *
 * Extrait l'Actor depuis la session courante. Lance une erreur si pas connecté.
 * À utiliser dans chaque Server Action mutant qui appelle lib/core.
 */

import { auth } from "@/auth";
import { type Actor } from "@/lib/core";

export type SessionMember = {
  memberId: string;
  role: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER";
};

/** Récupère l'Actor humain depuis la session, ou throw si pas authentifié. */
export async function currentActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const u = session.user as {
    id?: string;          // memberId (cuid) — stocké dans le JWT
    role?: "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER" | "SA" | "TM" | "T" | string;
  };

  if (!u.id) throw new Error("UNAUTHENTICATED");

  // Compat : ancien token JWT peut encore contenir "SA"/"TM"/"T" pendant
  // la transition. À retirer une fois tous les utilisateurs reloggués.
  const role = normalizeRole(u.role);

  return { type: "HUMAN", memberId: u.id, role };
}

function normalizeRole(
  r: string | undefined
): "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER" {
  switch (r) {
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
