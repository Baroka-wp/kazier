"use server";

/**
 * Reset password flow + change password.
 * Travaille contre Auth (V2).
 */

import { prisma } from "@/lib/core";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

// ── changePassword ──────────────────────────────────────────────────────

export async function changePassword(
  authId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!authId) return { success: false, error: "Utilisateur non identifié." };
  if (newPassword.length < 8) {
    return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.auth.update({
    where: { id: authId },
    data: { passwordHash: hashed },
  });
  return { success: true };
}

// ── requestPasswordReset ────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.auth.findUnique({ where: { email: normalized } });

    // Pour des raisons de sécurité, on retourne success même si l'email n'existe pas
    if (!user) return { success: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min

    await prisma.auth.update({
      where: { id: user.id },
      data: { resetToken: token, resetExpires: expiresAt },
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[requestPasswordReset] RESEND_API_KEY manquante");
      return {
        success: false,
        error: "Configuration email manquante. Contactez l'administrateur.",
      };
    }

    const resetUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "KAZIER <noreply@irotoribaroka.com>",
      to: [normalized],
      subject: "🔐 Réinitialisation de votre mot de passe",
      html: emailHtml(resetUrl),
    });

    return { success: true };
  } catch (err) {
    console.error("[requestPasswordReset]", err);
    return { success: false, error: "Impossible d'envoyer l'email. Réessayez plus tard." };
  }
}

function emailHtml(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#6B1A2A,#A0263A);padding:32px 40px;">
          <h1 style="margin:0;font-size:24px;color:white;font-weight:700;">Réinitialisation de mot de passe</h1>
        </div>
        <div style="padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">Ce lien expire dans <strong>60 minutes</strong>.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6B1A2A,#A0263A);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Réinitialiser mon mot de passe →</a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      </div>
    </body></html>`;
}

// ── validateResetToken ──────────────────────────────────────────────────

export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    if (!token || token.length < 10) return { valid: false, error: "Token invalide." };

    const user = await prisma.auth.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetExpires) {
      return { valid: false, error: "Ce lien n'est pas valide." };
    }
    if (user.resetExpires < new Date()) {
      return { valid: false, error: "Ce lien a expiré. Veuillez en demander un nouveau." };
    }
    return { valid: true };
  } catch (err) {
    console.error("[validateResetToken]", err);
    return { valid: false, error: "Erreur lors de la vérification du lien." };
  }
}

// ── resetPassword ───────────────────────────────────────────────────────

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (newPassword.length < 6) {
      return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
    }

    const validation = await validateResetToken(token);
    if (!validation.valid) return { success: false, error: validation.error };

    const user = await prisma.auth.findUnique({ where: { resetToken: token } });
    if (!user) return { success: false, error: "Token invalide." };

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.auth.update({
      where: { id: user.id },
      data: { passwordHash: hashed, resetToken: null, resetExpires: null },
    });
    return { success: true };
  } catch (err) {
    console.error("[resetPassword]", err);
    return { success: false, error: "Impossible de réinitialiser le mot de passe." };
  }
}
