"use server";

import { prisma } from "./prisma";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const TOKEN_EXPIRY_MINUTES = 60;

// ── Mailer Gmail — même config que l'existant ─────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Étape 1 : demande de reset ────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Même jointure que auth.ts — email dans users, prénom dans teams
  const user = await prisma.users.findFirst({
    where: {
      email: { equals: email.trim(), mode: 'insensitive' }
    },
    include: {
      teams: true
    }
  });

  if (!user) {
    return { success: false, error: "Aucun compte n'est associé à cet email." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      reset_token: token,
      reset_token_expires: expires,
    }
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  const firstName = user.teams?.first_name || "Boss";

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: `"Africa Samurai" <${process.env.GMAIL_USER}>`,
      to: email.trim(),
      subject: "🔐 Réinitialisation de votre mot de passe — Africa Samurai",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
            <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Header -->
              <div style="background:linear-gradient(135deg,#6B1A2A,#A0263A);padding:32px 40px;">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Africa Samurai</p>
                <h1 style="margin:8px 0 0;font-size:24px;color:white;font-weight:700;">
                  Bonjour ${firstName}, mot de passe oublié ? 🔐
                </h1>
              </div>

              <!-- Body -->
              <div style="padding:32px 40px;">
                <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
                  Nous avons reçu une demande de réinitialisation de votre mot de passe.<br/>
                  Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
                  Ce lien est valable pendant <strong>${TOKEN_EXPIRY_MINUTES} minutes</strong>. Après expiration, vous devrez refaire une demande.
                </p>

                <!-- CTA -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetUrl}"
                    style="display:inline-block;background:linear-gradient(135deg,#6B1A2A,#A0263A);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
                    Réinitialiser mon mot de passe →
                  </a>
                </div>

                <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
                  <a href="${resetUrl}" style="color:#6B1A2A;word-break:break-all;">${resetUrl}</a>
                </p>

                <p style="margin:24px 0 0;font-size:13px;color:#bbb;text-align:center;">
                  Si vous n'avez pas fait cette demande, ignorez cet email.<br/>Votre mot de passe ne sera pas modifié.
                </p>
              </div>

              <!-- Footer -->
              <div style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;">
                <p style="margin:0;font-size:12px;color:#bbb;text-align:center;">
                  Cet email a été envoyé automatiquement par Africa Samurai - Kazier.
                </p>
              </div>

            </div>
          </body>
        </html>
      `,
    });
  } catch (err) {
    console.error("Erreur envoi email:", err);
    return { success: false, error: "Erreur lors de l'envoi de l'email." };
  }

  return { success: true };
}

// ── Étape 2 : valider le token ────────────────────────────────────────────────

export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const user = await prisma.users.findFirst({
    where: { reset_token: token },
    select: {
      id: true,
      reset_token_expires: true
    }
  });

  if (!user) {
    return { valid: false, error: "Lien invalide ou déjà utilisé." };
  }

  if (!user.reset_token_expires || user.reset_token_expires < new Date()) {
    return { valid: false, error: "Ce lien a expiré. Faites une nouvelle demande." };
  }

  return { valid: true };
}

// ── Étape 3 : appliquer le nouveau mot de passe ───────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (newPassword.length < 6) {
    return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const user = await prisma.users.findFirst({
    where: { reset_token: token },
    select: {
      id: true,
      reset_token_expires: true
    }
  });

  if (!user) {
    return { success: false, error: "Lien invalide ou déjà utilisé." };
  }

  if (!user.reset_token_expires || user.reset_token_expires < new Date()) {
    return { success: false, error: "Ce lien a expiré. Faites une nouvelle demande." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      password: hashed,
      reset_token: null,
      reset_token_expires: null,
    }
  });

  return { success: true };
}

// ── Fonction utilitaire pour changer le mot de passe (ex: depuis le profil) ───────────────────────────────
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

