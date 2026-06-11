"use server";

/**
 * Server Actions — register/update/delete d'un membre + Auth associé.
 * Backend pour la page Équipe.
 *
 * Délègue à lib/core/members pour la création/MAJ du Member, et gère
 * directement la table Auth (le core n'a pas de fonction Auth dédiée).
 */

import { prisma, members as membersCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

// ── Types historiques préservés ──────────────────────────────────────────

export type RegisterData = {
  full_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age: string;
  role: string;
  is_boss: boolean;
  slack_id: string;
};

export type RegisterResult =
  | { success: true; user: { id: string; full_name: string; email: string } }
  | { success: false; error: string; field?: keyof RegisterData };

export type DuplicateResult =
  | { exists: false }
  | { exists: true; blocking: boolean; message: string };

// ── Email invitation Slack ──────────────────────────────────────────────

async function sendSlackInviteEmail(params: {
  first_name: string;
  last_name: string;
  email: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[sendSlackInviteEmail] RESEND_API_KEY missing — skipped");
      return;
    }
    const inviteLink = process.env.SLACK_INVITE_LINK ?? "#";
    const fullName = `${params.first_name} ${params.last_name}`;
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Africa Samurai <noreply@irotoribaroka.com>",
      to: [params.email],
      subject: "🎉 Bienvenue chez Africa Samurai — Rejoignez notre Slack",
      html: `
        <!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#6B1A2A,#A0263A);padding:32px 40px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Africa Samurai</p>
              <h1 style="margin:8px 0 0;font-size:24px;color:white;font-weight:700;">Bienvenue, ${fullName} 👋</h1>
            </div>
            <div style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
                Vous venez d'être ajouté à l'équipe <strong>Africa Samurai</strong>.
                Rejoignez notre Slack pour collaborer avec nous.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#6B1A2A,#A0263A);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Rejoindre Slack →</a>
              </div>
            </div>
          </div>
        </body></html>`,
    });
  } catch (e) {
    console.error("[sendSlackInviteEmail]", e);
  }
}

// ── Validation côté serveur ─────────────────────────────────────────────

function validateData(data: RegisterData): {
  valid: true;
} | { valid: false; error: string; field: keyof RegisterData } {
  if (!data.first_name?.trim()) return { valid: false, error: "Prénom requis.", field: "first_name" };
  if (!data.last_name?.trim()) return { valid: false, error: "Nom requis.", field: "last_name" };
  if (!data.email?.trim()) return { valid: false, error: "Email requis.", field: "email" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return { valid: false, error: "Email invalide.", field: "email" };
  }
  if (!data.role?.trim()) return { valid: false, error: "Rôle requis.", field: "role" };
  if (data.phone && !/^[0-9+()\-\s]+$/.test(data.phone)) {
    return { valid: false, error: "Téléphone invalide.", field: "phone" };
  }
  if (data.age && (isNaN(Number(data.age)) || Number(data.age) < 15)) {
    return { valid: false, error: "Âge invalide.", field: "age" };
  }
  return { valid: true };
}

// ── checkDuplicate ──────────────────────────────────────────────────────

export async function checkDuplicate(
  field: "email" | "phone" | "full_name" | "slack_id",
  value: string,
  excludeMemberId?: string
): Promise<DuplicateResult> {
  try {
    if (field === "email") {
      const normalized = value.trim().toLowerCase();
      const existing = await prisma.member.findFirst({
        where: {
          email: { equals: normalized, mode: "insensitive" },
          ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {}),
        },
        select: { id: true },
      });
      if (existing) {
        return { exists: true, blocking: true, message: "Cette adresse e-mail est déjà utilisée." };
      }
    } else if (field === "phone") {
      const existing = await prisma.member.findFirst({
        where: {
          phone: value.trim(),
          ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {}),
        },
        select: { id: true },
      });
      if (existing) {
        return { exists: true, blocking: true, message: "Ce numéro de téléphone est déjà utilisé." };
      }
    } else if (field === "slack_id") {
      const existing = await prisma.member.findFirst({
        where: {
          slackId: value.trim(),
          ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {}),
        },
        select: { id: true },
      });
      if (existing) {
        return { exists: true, blocking: true, message: "Ce Slack ID est déjà associé à un membre." };
      }
    } else if (field === "full_name") {
      const normalized = value.trim().toLowerCase();
      const candidates = await prisma.member.findMany({
        select: { id: true, firstName: true, lastName: true },
        where: excludeMemberId ? { NOT: { id: excludeMemberId } } : {},
      });
      const dup = candidates.find(
        (c) => `${c.firstName} ${c.lastName}`.trim().toLowerCase() === normalized
      );
      if (dup) {
        return {
          exists: true,
          blocking: false,
          message:
            "⚠️ Un utilisateur avec ce nom exact existe déjà. Continuez si c'est bien une personne différente.",
        };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

// ── registerUser ────────────────────────────────────────────────────────

export async function registerUser(data: RegisterData): Promise<RegisterResult> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN" || actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Non autorisé : seul un Super Admin peut créer un membre." };
    }

    const validation = validateData(data);
    if (!validation.valid) return { success: false, error: validation.error, field: validation.field };

    const email = data.email.trim().toLowerCase();

    // Doublon email côté Auth
    const existingAuth = await prisma.auth.findUnique({ where: { email }, select: { id: true } });
    if (existingAuth) {
      return { success: false, error: "Cette adresse e-mail est déjà utilisée.", field: "email" };
    }

    // 1. Création Member via core
    const memberRes = await membersCore.create(actor, {
      firstName: data.first_name.trim(),
      lastName: data.last_name.trim(),
      email,
      phone: data.phone?.trim() || undefined,
      age: data.age ? Number(data.age) : undefined,
      slackId: data.slack_id?.trim() || undefined,
      role: data.role as "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER",
      isBoss: data.is_boss,
    });
    if (!memberRes.ok) {
      return { success: false, error: memberRes.message };
    }

    // 2. Création Auth
    await prisma.auth.create({
      data: {
        memberId: memberRes.data.id,
        email,
        passwordHash: await bcrypt.hash("motdepasse123", 10),
      },
    });

    // 3. Email invitation Slack (non-bloquant)
    sendSlackInviteEmail({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email,
    }).catch(() => {});

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");

    return {
      success: true,
      user: {
        id: memberRes.data.id,
        full_name: memberRes.data.fullName,
        email,
      },
    };
  } catch (e) {
    console.error("[registerUser]", e);
    return { success: false, error: "Erreur lors de la création du membre." };
  }
}

// ── updateUser ──────────────────────────────────────────────────────────

export async function updateUser(
  memberId: string,
  data: RegisterData
): Promise<RegisterResult> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN" || actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Non autorisé." };
    }

    const validation = validateData(data);
    if (!validation.valid) return { success: false, error: validation.error, field: validation.field };

    const email = data.email.trim().toLowerCase();

    // MAJ Member
    const updated = await membersCore.update(actor, memberId, {
      firstName: data.first_name.trim(),
      lastName: data.last_name.trim(),
      email,
      phone: data.phone?.trim() || undefined,
      age: data.age ? Number(data.age) : undefined,
      slackId: data.slack_id?.trim() || undefined,
      role: data.role as "SUPER_ADMIN" | "PROJECT_MANAGER" | "MEMBER",
      isBoss: data.is_boss,
    });
    if (!updated.ok) return { success: false, error: updated.message };

    // Sync email côté Auth si différent
    const auth = await prisma.auth.findUnique({ where: { memberId } });
    if (auth && auth.email !== email) {
      await prisma.auth.update({ where: { memberId }, data: { email } });
    }

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");
    return {
      success: true,
      user: { id: updated.data.id, full_name: updated.data.fullName, email },
    };
  } catch (e) {
    console.error("[updateUser]", e);
    return { success: false, error: "Erreur lors de la modification du membre." };
  }
}

// ── deleteUser ──────────────────────────────────────────────────────────

export async function deleteUser(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN" || actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Non autorisé." };
    }

    // Suppression hard du Member → cascade sur Auth, ProjectMember, TaskAssignment,
    // TaskComment, Report, Evaluation (configurés en onDelete: Cascade dans le schema).
    await prisma.member.delete({ where: { id: memberId } });

    revalidatePath("/dashboard/equipe");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteUser]", e);
    return { success: false, error: "Erreur lors de la suppression du membre." };
  }
}
