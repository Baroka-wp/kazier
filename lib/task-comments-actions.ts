"use server";

import { prisma } from "./prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { notifyTaskComment } from "./notify-task-comment";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskComment = {
  id: number;
  task_id: number;
  team_id: number;
  content: string;
  created_at: string;
  author_name: string;
  author_role: string | null;
};

// ── GET COMMENTS ──────────────────────────────────────────────────────────────

export async function getTaskComments(taskId: number): Promise<{
  success: boolean;
  comments?: TaskComment[];
  error?: string;
}> {
  try {
    const comments = await prisma.task_comments.findMany({
      where: { task_id: taskId },
      include: {
        team: {
          select: {
            first_name: true,
            last_name: true,
            users: { select: { role: true }, take: 1 },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return {
      success: true,
      comments: comments.map((c) => ({
        id: c.id,
        task_id: c.task_id,
        team_id: c.team_id,
        content: c.content,
        created_at: c.created_at.toISOString(),
        author_name: `${c.team.first_name ?? ""} ${c.team.last_name ?? ""}`.trim(),
        author_role: c.team.users[0]?.role ?? null,
      })),
    };
  } catch (err: unknown) {
    console.error("[getTaskComments]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la récupération des commentaires." };
  }
}

// ── ADD COMMENT ───────────────────────────────────────────────────────────────

export async function addTaskComment(
  taskId: number,
  content: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Non authentifié." };

    const teamId = parseInt((session.user as { team_id?: string }).team_id ?? "0");
    if (!teamId) return { success: false, error: "Membre non trouvé." };

    if (!content.trim()) return { success: false, error: "Le commentaire ne peut pas être vide." };

    const comment = await prisma.task_comments.create({
      data: {
        task_id: taskId,
        team_id: teamId,
        content: content.trim(),
      },
      include: {
        team: {
          select: {
            first_name: true,
            last_name: true,
            users: { select: { role: true }, take: 1 },
          },
        },
      },
    });

    revalidatePath("/dashboard/tasks");

    //Notifier les membres liés à la tâche omis le propriétaire du commentaire
    await notifyTaskComment({
      taskId,
      authorId: comment.team_id,
      authorName: `${comment.team.first_name ?? ""} ${comment.team.last_name ?? ""}`.trim(),
      content: comment.content,
    });

    console.log("Après notifyTaskComment");

    return {
      success: true,
      comment: {
        id: comment.id,
        task_id: comment.task_id,
        team_id: comment.team_id,
        content: comment.content,
        created_at: comment.created_at.toISOString(),
        author_name: `${comment.team.first_name ?? ""} ${comment.team.last_name ?? ""}`.trim(),
        author_role: comment.team.users[0]?.role ?? null,
      },
    };
  } catch (err: unknown) {
    console.error("[addTaskComment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de l'ajout du commentaire." };
  }
}

// ── UPDATE COMMENT ─────────────────────────────────────────────────────────────

export async function updateTaskComment(
  commentId: number,
  content: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Non authentifié." };

    const teamId = parseInt((session.user as { team_id?: string }).team_id ?? "0");

    const comment = await prisma.task_comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) return { success: false, error: "Commentaire non trouvé." };

    // Seul l'auteur peut modifier
    if (comment.team_id !== teamId) {
      return { success: false, error: "Non autorisé." };
    }

    if (!content.trim()) return { success: false, error: "Le commentaire ne peut pas être vide." };

    const updated = await prisma.task_comments.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        team: {
          select: {
            first_name: true,
            last_name: true,
            users: { select: { role: true }, take: 1 },
          },
        },
      },
    });

    revalidatePath("/dashboard/tasks");

    return {
      success: true,
      comment: {
        id: updated.id,
        task_id: updated.task_id,
        team_id: updated.team_id,
        content: updated.content,
        created_at: updated.created_at.toISOString(),
        author_name: `${updated.team.first_name ?? ""} ${updated.team.last_name ?? ""}`.trim(),
        author_role: updated.team.users[0]?.role ?? null,
      },
    };
  } catch (err: unknown) {
    console.error("[updateTaskComment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la modification du commentaire." };
  }
}

// ── DELETE COMMENT ────────────────────────────────────────────────────────────

export async function deleteTaskComment(
  commentId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Non authentifié." };

    const teamId = parseInt((session.user as { team_id?: string }).team_id ?? "0");
    const userRole = (session.user as { role?: string }).role ?? null;

    const comment = await prisma.task_comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) return { success: false, error: "Commentaire non trouvé." };

    // Seul l'auteur ou un SA peut supprimer
    const isSA = userRole === "SA";
    const isAuthor = comment.team_id === teamId;
    if (!isSA && !isAuthor) {
      return { success: false, error: "Non autorisé." };
    }

    await prisma.task_comments.delete({ where: { id: commentId } });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteTaskComment]", err instanceof Error ? err.message : String(err));
    return { success: false, error: "Erreur lors de la suppression du commentaire." };
  }
}
