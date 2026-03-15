"use server";

import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { BrevoClient } from "@getbrevo/brevo";

// ── Fonction utilitaire pour changer le mot de passe (ex: depuis le profil) ──

export async function changePassword(
  userId: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!userId) return { success: false, error: "Utilisateur non identifié." };
  if (newPassword.length < 8)
    return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.users.update({
    where: { id: Number(userId) },
    data: { password: hashed },
  });

  return { success: true };
}

// ── Étape 1 : demande de reset ───────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const normalized = email.trim().toLowerCase();

    // Vérifier si l'utilisateur existe
    const user = await prisma.users.findUnique({
      where: { email: normalized },
    });

    // Pour des raisons de sécurité, retourner success même si l'email n'existe pas
    if (!user) {
      return { success: true };
    }

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Stocker le token dans la base de données
    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_token: token,
        reset_token_expires: expiresAt,
      },
    });

    // Vérifier la clé API Brevo
    if (!process.env.BREVO_API_KEY) {
      console.error("[requestPasswordReset] BREVO_API_KEY manquante");
      return {
        success: false,
        error: "Configuration email manquante. Contactez l'administrateur.",
      };
    }

    // Générer l'URL de reset
    const resetUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Configurer le client Brevo
    const client = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY,
    });

    // Envoyer l'email via l'API Brevo
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: "KAZIER", email: "mail@irotoribaroka.com" },
      to: [{ email: normalized }],
      subject: "🔐 Réinitialisation de votre mot de passe",
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
            <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#6B1A2A,#A0263A);padding:32px 40px;">
                <h1 style="margin:0;font-size:24px;color:white;font-weight:700;">
                  Réinitialisation de mot de passe
                </h1>
              </div>
              <div style="padding:32px 40px;">
                <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
                  Vous avez demandé à réinitialiser votre mot de passe.
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
                  Ce lien expire dans <strong>60 minutes</strong>.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetUrl}"
                    style="display:inline-block;background:linear-gradient(135deg,#6B1A2A,#A0263A);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
                    Réinitialiser mon mot de passe →
                  </a>
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center;">
                  Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (err) {
    console.error("[requestPasswordReset]", err);
    return { success: false, error: "Impossible d'envoyer l'email. Réessayez plus tard." };
  }
}

// ── Étape 2 : valider le token ────────────────────────────────────────────────

export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    if (!token || token.length < 10) {
      return { valid: false, error: "Token invalide." };
    }

    // Chercher l'utilisateur par token
    const user = await prisma.users.findUnique({
      where: { reset_token: token },
    });

    if (!user || !user.reset_token_expires) {
      return { valid: false, error: "Ce lien n'est pas valide." };
    }

    // Vérifier si le token n'a pas expiré
    if (user.reset_token_expires < new Date()) {
      return { valid: false, error: "Ce lien a expiré. Veuillez en demander un nouveau." };
    }

    return { valid: true };
  } catch (err) {
    console.error("[validateResetToken]", err);
    return { valid: false, error: "Erreur lors de la vérification du lien." };
  }
}

// ── Étape 3 : appliquer le nouveau mot de passe ──────────────────────────────

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validation du mot de passe
    if (newPassword.length < 6) {
      return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
    }

    // Valider le token à nouveau
    const validation = await validateResetToken(token);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Trouver l'utilisateur via le token
    const user = await prisma.users.findUnique({
      where: { reset_token: token },
    });

    if (!user) {
      return { success: false, error: "Token invalide." };
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Mettre à jour le mot de passe et supprimer le token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[resetPassword]", err);
    return { success: false, error: "Impossible de réinitialiser le mot de passe." };
  }
}
