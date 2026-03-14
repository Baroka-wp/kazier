"use server";

import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { auth } from "@/auth";
import { getPermissions } from "@/lib/permissions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterData = {
  full_name?:  string;
  first_name: string;
  last_name:  string;
  email:      string;
  phone:      string;
  age:        string;
  role:       string;
  is_boss:    boolean;
  slack_id:   string;
};

export type RegisterResult =
  | { success: true;  user: { id: number; full_name: string; email: string } }
  | { success: false; error: string; field?: keyof RegisterData };

export type DuplicateResult =
  | { exists: false }
  | { exists: true; blocking: boolean; message: string };

// ── Email invitation Slack ────────────────────────────────────────────────────

async function sendSlackInviteEmail(params: {
  first_name: string;
  last_name:  string;
  email:      string;
}) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const inviteLink = process.env.SLACK_INVITE_LINK ?? "#";
    const fullName   = `${params.first_name} ${params.last_name}`;

    await transporter.sendMail({
      from:    `"Africa Samurai" <${process.env.GMAIL_USER}>`,
      to:      params.email,
      subject: "🎉 Bienvenue chez Africa Samurai — Rejoignez notre Slack",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
            <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Header -->
              <div style="background:linear-gradient(135deg,#6B1A2A,#A0263A);padding:32px 40px;">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Africa Samurai</p>
                <h1 style="margin:8px 0 0;font-size:24px;color:white;font-weight:700;">
                  Bienvenue, ${fullName} 👋
                </h1>
              </div>

              <!-- Body -->
              <div style="padding:32px 40px;">
                <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
                  Vous venez d'être ajouté à l'équipe <strong>Africa Samurai</strong>.
                  Pour collaborer avec nous, rejoignez notre espace Slack en cliquant sur le bouton ci-dessous.
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
                  Slack est notre outil principal de communication — vous y recevrez vos rappels quotidiens et resterez en contact avec l'équipe.
                </p>

                <!-- CTA -->
                <div style="text-align:center;margin:32px 0;">
                  <a href="${inviteLink}"
                    style="display:inline-block;background:linear-gradient(135deg,#6B1A2A,#A0263A);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
                    Rejoindre le Slack →
                  </a>
                </div>

                <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
                  <a href="${inviteLink}" style="color:#6B1A2A;word-break:break-all;">${inviteLink}</a>
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
    // Non bloquant — la création du membre continue même si l'email échoue
    console.error("[sendSlackInviteEmail]", err);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateData(data: RegisterData):
  | { valid: true }
  | { valid: false; error: string; field: keyof RegisterData }
{
  const first = data.first_name?.trim();
  if (!first || first.length < 2)
    return { valid: false, error: "Le prénom doit contenir au moins 2 caractères.", field: "first_name" };
  if (first.length > 100)
    return { valid: false, error: "Le prénom est trop long (100 caractères max).", field: "first_name" };

  const last = data.last_name?.trim();
  if (!last || last.length < 2)
    return { valid: false, error: "Le nom doit contenir au moins 2 caractères.", field: "last_name" };
  if (last.length > 100)
    return { valid: false, error: "Le nom est trop long (100 caractères max).", field: "last_name" };

  const mail = data.email?.trim();
  if (!mail)
    return { valid: false, error: "L'adresse e-mail est requise.", field: "email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
    return { valid: false, error: "L'adresse e-mail est invalide.", field: "email" };

  const tel = data.phone?.trim();
  if (!tel)
    return { valid: false, error: "Le numéro de téléphone est requis.", field: "phone" };
  if (!/^\+?[0-9]{7,15}$/.test(tel.replace(/[\s\-().]/g, "")))
    return { valid: false, error: "Le numéro de téléphone est invalide.", field: "phone" };

  const ageNum = Number(data.age);
  if (!data.age || isNaN(ageNum) || ageNum < 10 || ageNum > 100)
    return { valid: false, error: "L'âge doit être compris entre 10 et 100.", field: "age" };

  if (!data.role?.trim())
    return { valid: false, error: "Le rôle est requis.", field: "role" };

  return { valid: true };
}

// ── Vérification doublon (temps réel) ────────────────────────────────────────

export async function checkDuplicate(
  field: "email" | "phone" | "full_name" | "slack_id",
  value: string,
  excludeTeamId?: number
): Promise<DuplicateResult> {
  try {
    if (field === "email") {
      const normalized = value.trim().toLowerCase();
      const user = excludeTeamId
        ? await prisma.users.findFirst({
            where: {
              email: { equals: normalized, mode: 'insensitive' },
              team_id: { not: excludeTeamId }
            }
          })
        : await prisma.users.findFirst({
            where: {
              email: { equals: normalized, mode: 'insensitive' }
            }
          });
      if (user)
        return { exists: true, blocking: true, message: "Cette adresse e-mail est déjà utilisée." };
    }

    else if (field === "phone") {
      const normalized = value.trim();
      const team = excludeTeamId
        ? await prisma.teams.findFirst({
            where: {
              phone: normalized,
              id: { not: excludeTeamId }
            }
          })
        : await prisma.teams.findFirst({
            where: { phone: normalized }
          });
      if (team)
        return { exists: true, blocking: true, message: "Ce numéro de téléphone est déjà utilisé." };
    }

    else if (field === "slack_id") {
      const normalized = value.trim();
      const team = excludeTeamId
        ? await prisma.teams.findFirst({
            where: {
              slack_id: normalized,
              id: { not: excludeTeamId }
            }
          })
        : await prisma.teams.findFirst({
            where: { slack_id: normalized }
          });
      if (team)
        return { exists: true, blocking: true, message: "Ce Slack ID est déjà associé à un membre." };
    }

    else if (field === "full_name") {
      const normalized = value.trim().toLowerCase();
      const teams = excludeTeamId
        ? await prisma.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM teams
            WHERE LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = ${normalized}
            AND id <> ${excludeTeamId}
            LIMIT 1`
        : await prisma.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM teams
            WHERE LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = ${normalized}
            LIMIT 1`;
      if (teams.length > 0)
        return {
          exists: true,
          blocking: false,
          message: "⚠️ Un utilisateur avec ce nom exact existe déjà. Continuez si c'est bien une personne différente.",
        };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}

// ── Helper: Vérifier authentification et permissions ─────────────────────────

async function requireTeamManagement() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canManageTeam) {
    throw new Error("Non autorisé: permissions insuffisantes");
  }

  return session.user;
}

// ── Créer un membre ───────────────────────────────────────────────────────────

export async function registerUser(data: RegisterData): Promise<RegisterResult> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    const validation = validateData(data);
    if (!validation.valid)
      return { success: false, error: validation.error, field: validation.field };

    const first_name = data.first_name.trim();
    const last_name  = data.last_name.trim();
    const email      = data.email.trim().toLowerCase();
    const phone      = data.phone.trim();
    const age        = Number(data.age);
    const role       = data.role.trim();
    const is_boss    = data.is_boss;
    const slack_id   = data.slack_id?.trim() || null;

    // Vérif doublons
    const [emailCheck, phoneCheck, slackCheck] = await Promise.all([
      prisma.users.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      }),
      prisma.teams.findFirst({
        where: { phone }
      }),
      slack_id ? prisma.teams.findFirst({
        where: { slack_id }
      }) : Promise.resolve(null),
    ]);

    if (emailCheck)
      return { success: false, error: "Cette adresse e-mail est déjà utilisée.", field: "email" };
    if (phoneCheck)
      return { success: false, error: "Ce numéro de téléphone est déjà utilisé.", field: "phone" };
    if (slackCheck)
      return { success: false, error: "Ce Slack ID est déjà associé à un membre.", field: "slack_id" };

    // 1. Insérer dans teams
    const team = await prisma.teams.create({
      data: {
        first_name,
        last_name,
        phone,
        age,
        is_boss,
        slack_id,
      }
    });

    // 2. Insérer dans users avec team_id
    await prisma.users.create({
      data: {
        email,
        password: await bcrypt.hash("motdepasse123", 10),
        role,
        team_id: team.id,
      }
    });

    // 3. Envoyer l'email d'invitation Slack (non bloquant)
    await sendSlackInviteEmail({ first_name, last_name, email });

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");

    return {
      success: true,
      user: { id: team.id, full_name: `${first_name} ${last_name}`, email },
    };

  } catch (err: any) {
    console.error("[registerUser]", err);
    if (err?.code === "23505" || err?.code === "P2002") {
      if (err.meta?.target?.includes("email") || err.constraint?.includes("email"))
        return { success: false, error: "Cette adresse e-mail est déjà utilisée.", field: "email" };
      if (err.meta?.target?.includes("phone") || err.constraint?.includes("phone"))
        return { success: false, error: "Ce numéro de téléphone est déjà utilisé.", field: "phone" };
      if (err.meta?.target?.includes("slack_id") || err.constraint?.includes("slack_id"))
        return { success: false, error: "Ce Slack ID est déjà associé à un membre.", field: "slack_id" };
    }
    return { success: false, error: "Une erreur est survenue. Veuillez réessayer." };
  }
}

// ── Modifier un membre ────────────────────────────────────────────────────────

export async function updateUser(
  teamId: number,
  data: RegisterData
): Promise<RegisterResult> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    const validation = validateData(data);
    if (!validation.valid)
      return { success: false, error: validation.error, field: validation.field };

    const first_name = data.first_name.trim();
    const last_name  = data.last_name.trim();
    const email      = data.email.trim().toLowerCase();
    const phone      = data.phone.trim();
    const age        = Number(data.age);
    const role       = data.role.trim();
    const is_boss    = data.is_boss;
    const slack_id   = data.slack_id?.trim() || null;

    // Vérif doublons en excluant le membre courant
    const [emailCheck, phoneCheck, slackCheck] = await Promise.all([
      prisma.users.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          team_id: { not: teamId }
        }
      }),
      prisma.teams.findFirst({
        where: {
          phone,
          id: { not: teamId }
        }
      }),
      slack_id ? prisma.teams.findFirst({
        where: {
          slack_id,
          id: { not: teamId }
        }
      }) : Promise.resolve(null),
    ]);

    if (emailCheck)
      return { success: false, error: "Cette adresse e-mail est déjà utilisée.", field: "email" };
    if (phoneCheck)
      return { success: false, error: "Ce numéro de téléphone est déjà utilisé.", field: "phone" };
    if (slackCheck)
      return { success: false, error: "Ce Slack ID est déjà associé à un membre.", field: "slack_id" };

    // Mettre à jour teams
    await prisma.teams.update({
      where: { id: teamId },
      data: {
        first_name,
        last_name,
        phone,
        age,
        is_boss,
        slack_id,
      }
    });

    // Mettre à jour users (email + role)
    await prisma.users.updateMany({
      where: { team_id: teamId },
      data: {
        email,
        role,
      }
    });

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");

    return {
      success: true,
      user: { id: teamId, full_name: `${first_name} ${last_name}`, email },
    };

  } catch (err: any) {
    console.error("[updateUser]", err);
    if (err?.code === "23505" || err?.code === "P2002") {
      if (err.meta?.target?.includes("email") || err.constraint?.includes("email"))
        return { success: false, error: "Cette adresse e-mail est déjà utilisée.", field: "email" };
      if (err.meta?.target?.includes("phone") || err.constraint?.includes("phone"))
        return { success: false, error: "Ce numéro de téléphone est déjà utilisé.", field: "phone" };
      if (err.meta?.target?.includes("slack_id") || err.constraint?.includes("slack_id"))
        return { success: false, error: "Ce Slack ID est déjà associé à un membre.", field: "slack_id" };
    }
    return { success: false, error: "Impossible de mettre à jour ce membre pour le moment." };
  }
}

// ── Supprimer un membre ───────────────────────────────────────────────────────

export async function deleteUser(
  teamId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ Vérifier authentification et permissions
    await requireTeamManagement();

    await prisma.users.deleteMany({
      where: { team_id: teamId }
    });
    await prisma.teams.delete({
      where: { id: teamId }
    });
    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[deleteUser]", err);
    return { success: false, error: "Erreur lors de la suppression du membre." };
  }
}
