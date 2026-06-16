"use server";

/**
 * Wrappers Server Actions — notes de projet (ProjectNote).
 * Délègue à lib/core/notes puis adapte le shape pour l'UI dashboard.
 */

import { notes as notesCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import { revalidatePath } from "next/cache";

export type ProjectNote = {
  id: string;
  project_id: string;
  title: string;
  text: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

function extractText(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "content" in body) {
    const doc = body as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (doc.content ?? [])
      .flatMap((node) => (node.content ?? []).map((leaf) => leaf.text ?? ""))
      .join("\n");
  }
  return "";
}

function toTipTapDoc(text: string) {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })),
  };
}

// ── getProjectNotes ──────────────────────────────────────────────────────

export async function getProjectNotes(projectId: string): Promise<{
  success: boolean;
  notes?: ProjectNote[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await notesCore.list(actor, { projectId, limit: 100 });
    if (!res.ok) return { success: false, error: res.message };

    return {
      success: true,
      notes: res.data.data.map((n) => ({
        id: n.id,
        project_id: n.projectId,
        title: n.title,
        text: extractText(n.body),
        tags: n.tags,
        pinned: n.pinned,
        created_at: n.createdAt.toISOString(),
        updated_at: n.updatedAt.toISOString(),
      })),
    };
  } catch (e) {
    console.error("[getProjectNotes]", e);
    return { success: false, error: "Erreur lors de la récupération des notes." };
  }
}

// ── createProjectNote ────────────────────────────────────────────────────

export async function createProjectNote(
  projectId: string,
  title: string,
  text: string,
  tags: string[] = [],
  pinned = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await notesCore.create(actor, {
      projectId,
      title,
      body: toTipTapDoc(text),
      tags,
      pinned,
    });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (e) {
    console.error("[createProjectNote]", e);
    return { success: false, error: "Erreur lors de la création de la note." };
  }
}

// ── updateProjectNote ────────────────────────────────────────────────────

export async function updateProjectNote(
  id: string,
  projectId: string,
  data: { title?: string; text?: string; pinned?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await notesCore.update(actor, id, {
      title: data.title,
      body: data.text !== undefined ? toTipTapDoc(data.text) : undefined,
      pinned: data.pinned,
    });
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateProjectNote]", e);
    return { success: false, error: "Erreur lors de la modification de la note." };
  }
}

// ── deleteProjectNote ────────────────────────────────────────────────────

export async function deleteProjectNote(
  id: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await currentActor();
    const res = await notesCore.remove(actor, id);
    if (!res.ok) return { success: false, error: res.message };

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (e) {
    console.error("[deleteProjectNote]", e);
    return { success: false, error: "Erreur lors de la suppression de la note." };
  }
}
