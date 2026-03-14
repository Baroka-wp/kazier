"use server";

import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// ── Fonction utilitaire pour changer le mot de passe (ex: depuis le profil) ──

export async function changePassword(userId: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!userId) return { success: false, error: "Utilisateur non identifié." };
  if (newPassword.length < 8) return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.users.update({
    where: { id: Number(userId) },
    data: { password: hashed }
  });

  return { success: true };
}

// ── Étape 1 : demande de reset (DÉSACTIVÉE) ───────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Fonctionnalité désactivée : les champs reset_token et reset_token_expires
  // n'existent pas dans le schema Prisma actuel
  return { success: false, error: "La réinitialisation de mot de passe n'est pas disponible." };
}

// ── Étape 2 : valider le token (DÉSACTIVÉE) ───────────────────────────────────

export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  return { valid: false, error: "Fonctionnalité non disponible." };
}

// ── Étape 3 : appliquer le nouveau mot de passe (DÉSACTIVÉE) ──────────────────

export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return { success: false, error: "Fonctionnalité non disponible." };
}
