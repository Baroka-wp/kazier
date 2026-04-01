"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type Milestone = {
  id: number;
  project_id: number;
  title: string;
  due_date: Date;
  deliverables: string | null;
  created_at: Date;
};

export type CreateMilestoneData = {
  project_id: number;
  title: string;
  due_date: string;
  deliverables?: string | null;
};

export type UpdateMilestoneData = Partial<CreateMilestoneData>;

export type MilestoneResult =
  | { success: true; milestone: Milestone }
  | { success: false; error: string };

/**
 * Get all milestones for a project
 */
export async function getMilestones(projectId: number): Promise<{
  success: boolean;
  milestones?: Milestone[];
  error?: string;
}> {
  try {
    const milestones = await prisma.milestones.findMany({
      where: { project_id: projectId },
      orderBy: { due_date: "asc" },
    });
    return { success: true, milestones };
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return { success: false, error: "Erreur lors de la récupération des milestones" };
  }
}

/**
 * Create a new milestone
 */
export async function createMilestone(data: CreateMilestoneData): Promise<MilestoneResult> {
  try {
    if (!data.title.trim()) {
      return { success: false, error: "Le titre est requis" };
    }
    if (!data.due_date) {
      return { success: false, error: "La date est requise" };
    }

    const milestone = await prisma.milestones.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        due_date: new Date(data.due_date),
        deliverables: data.deliverables || null,
      },
    });

    revalidatePath(`/dashboard/projects/${data.project_id}`);
    return { success: true, milestone };
  } catch (error) {
    console.error("Error creating milestone:", error);
    return { success: false, error: "Erreur lors de la création du milestone" };
  }
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  id: number,
  data: UpdateMilestoneData
): Promise<MilestoneResult> {
  try {
    const milestone = await prisma.milestones.update({
      where: { id },
      data: {
        title: data.title,
        due_date: data.due_date ? new Date(data.due_date) : undefined,
        deliverables: data.deliverables,
      },
    });

    revalidatePath(`/dashboard/projects/${milestone.project_id}`);
    return { success: true, milestone };
  } catch (error) {
    console.error("Error updating milestone:", error);
    return { success: false, error: "Erreur lors de la modification du milestone" };
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const milestone = await prisma.milestones.findUnique({
      where: { id },
    });

    if (!milestone) {
      return { success: false, error: "Milestone non trouvé" };
    }

    await prisma.milestones.delete({
      where: { id },
    });

    revalidatePath(`/dashboard/projects/${milestone.project_id}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return { success: false, error: "Erreur lors de la suppression du milestone" };
  }
}
