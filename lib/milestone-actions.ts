"use server";

/**
 * Wrappers Server Actions — milestones (= deliverables avec cadence MILESTONE).
 */

import { deliverables } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date: Date;
  deliverables: string | null;
  created_at: Date;
};

export type CreateMilestoneData = {
  project_id: string;
  title: string;
  due_date: string;
  deliverables?: string | null;
};

export type UpdateMilestoneData = Partial<CreateMilestoneData>;

export type MilestoneResult =
  | { success: true; milestone: Milestone }
  | { success: false; error: string };

function toMilestone(d: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: Date;
  createdAt: Date;
}): Milestone {
  return {
    id: d.id,
    project_id: d.projectId,
    title: d.title,
    due_date: d.dueDate,
    deliverables: d.description,
    created_at: d.createdAt,
  };
}

export async function getMilestones(projectId: string): Promise<{
  success: boolean;
  milestones?: Milestone[];
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await deliverables.list(actor, {
      projectId,
      cadence: "MILESTONE",
      limit: 100,
    });
    if (!res.ok) return { success: false, error: res.message };
    return { success: true, milestones: res.data.data.map(toMilestone) };
  } catch (e) {
    console.error("[getMilestones]", e);
    return { success: false, error: "Erreur lors de la récupération des milestones" };
  }
}

export async function createMilestone(data: CreateMilestoneData): Promise<MilestoneResult> {
  try {
    const actor = await currentActor();
    const res = await deliverables.create(actor, {
      projectId: data.project_id,
      title: data.title,
      description: data.deliverables ?? undefined,
      cadence: "MILESTONE",
      dueDate: data.due_date,
    });
    if (!res.ok) return { success: false, error: res.message };
    return { success: true, milestone: toMilestone(res.data) };
  } catch (e) {
    console.error("[createMilestone]", e);
    return { success: false, error: "Erreur lors de la création du milestone" };
  }
}

export async function updateMilestone(
  id: string,
  data: UpdateMilestoneData
): Promise<MilestoneResult> {
  try {
    const actor = await currentActor();
    const res = await deliverables.update(actor, id, {
      title: data.title,
      description: data.deliverables ?? undefined,
      dueDate: data.due_date,
    });
    if (!res.ok) return { success: false, error: res.message };
    return { success: true, milestone: toMilestone(res.data) };
  } catch (e) {
    console.error("[updateMilestone]", e);
    return { success: false, error: "Erreur lors de la modification du milestone" };
  }
}

export async function deleteMilestone(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const actor = await currentActor();
    const res = await deliverables.remove(actor, id);
    if (!res.ok) return { success: false, error: res.message };
    return { success: true };
  } catch (e) {
    console.error("[deleteMilestone]", e);
    return { success: false, error: "Erreur lors de la suppression du milestone" };
  }
}
