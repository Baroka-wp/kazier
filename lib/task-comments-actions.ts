"use server";

/**
 * Wrappers Server Actions — commentaires sur tâches.
 * Délègue à tasks.addComment / listComments + update/delete via prisma.
 */

import { tasks as tasksCore, prisma } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

export type TaskComment = {
  id: string;
  task_id: string;
  team_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_role: string | null;
};

// ── getTaskComments ──────────────────────────────────────────────────────

export async function getTaskComments(taskId: string): Promise<{
  success: boolean;
  comments?: TaskComment[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.listComments(actor, taskId);
    if (!res.ok) return { success: false, error: res.message };

    // On enrichit avec author_role en récupérant les Members en une requête
    const memberIds = [...new Set(res.data.map((c) => c.memberId))];
    const roles = memberIds.length
      ? await prisma.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, role: true },
        })
      : [];
    const roleById = new Map(roles.map((m) => [m.id, m.role]));

    return {
      success: true,
      comments: res.data.map((c) => ({
        id: c.id,
        task_id: c.taskId,
        team_id: c.memberId,
        content: c.content,
        created_at: c.createdAt.toISOString(),
        author_name: c.authorName,
        author_role: roleById.get(c.memberId) ?? null,
      })),
    };
  } catch (e) {
    console.error("[getTaskComments]", e);
    return { success: false, error: "Erreur lors de la récupération des commentaires." };
  }
}

// ── addTaskComment ───────────────────────────────────────────────────────

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await tasksCore.addComment(actor, { taskId, content });
    if (!res.ok) return { success: false, error: res.message };

    const member = await prisma.member.findUnique({
      where: { id: res.data.memberId },
      select: { role: true },
    });

    revalidatePath(`/dashboard/tasks/${taskId}`);
    return {
      success: true,
      comment: {
        id: res.data.id,
        task_id: res.data.taskId,
        team_id: res.data.memberId,
        content: res.data.content,
        created_at: res.data.createdAt.toISOString(),
        author_name: res.data.authorName,
        author_role: member?.role ?? null,
      },
    };
  } catch (e) {
    console.error("[addTaskComment]", e);
    return { success: false, error: "Erreur lors de l'ajout du commentaire." };
  }
}

// ── updateTaskComment ───────────────────────────────────────────────────

export async function updateTaskComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN") {
      return { success: false, error: "Non autorisé." };
    }

    const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!existing) return { success: false, error: "Commentaire introuvable." };
    // Seul l'auteur ou un SA peut éditer
    if (existing.memberId !== actor.memberId && actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Vous ne pouvez éditer que vos propres commentaires." };
    }

    await prisma.taskComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    });
    revalidatePath(`/dashboard/tasks/${existing.taskId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateTaskComment]", e);
    return { success: false, error: "Erreur lors de la modification du commentaire." };
  }
}

// ── deleteTaskComment ───────────────────────────────────────────────────

export async function deleteTaskComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN") {
      return { success: false, error: "Non autorisé." };
    }

    const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!existing) return { success: false, error: "Commentaire introuvable." };
    if (existing.memberId !== actor.memberId && actor.role !== "SUPER_ADMIN") {
      return { success: false, error: "Vous ne pouvez supprimer que vos propres commentaires." };
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    revalidatePath(`/dashboard/tasks/${existing.taskId}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteTaskComment]", e);
    return { success: false, error: "Erreur lors de la suppression du commentaire." };
  }
}
