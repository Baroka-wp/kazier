"use server";

import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// ── Fonction utilitaire pour changer le mot de passe (ex: depuis le profil) ──

export async function changePassword(
  userId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!userId) return { success: false, error: "Utilisateur non identifié." };
    return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };


  await prisma.users.update({
    where: { id: Number(userId) },
    data: { password: hashed },
  });

  return { success: true };
}

// ── Étape 1 : demande de reset (DÉSACTIVÉE) ───────────────────────────────────

  success: boolean;
  error?: string;
}> {
  // n'existent pas dans le schema Prisma actuel
  return { success: false, error: "La réinitialisation de mot de passe n'est pas disponible." };
}


  valid: boolean;
  error?: string;
}> {
  return { valid: false, error: "Fonctionnalité non disponible." };
}

// ── Étape 3 : appliquer le nouveau mot de passe (DÉSACTIVÉE) ──────────────────

export async function resetPassword(
): Promise<{
  success: boolean;
  error?: string;
}> {
  return { success: false, error: "Fonctionnalité non disponible." };
}
