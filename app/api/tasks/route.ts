import { NextResponse } from "next/server";
import { getTasks } from "@/lib/task-actions";
import { auth } from "@/auth";
import { isTeamManager } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as { role?: string; team_id?: number };
    const role = user?.role ?? null;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const projectId = searchParams.get("projectId")
      ? parseInt(searchParams.get("projectId")!)
      : undefined;
    const assignedTo = searchParams.get("assignedTo")
      ? parseInt(searchParams.get("assignedTo")!)
      : undefined;

    // 👇 Si TM, récupérer les project_ids de ses projets
    let allowedProjectIds: number[] | undefined = undefined;
    if (isTeamManager(role) && user?.team_id) {
      const projects = await prisma.project.findMany({
        where: { team_ids: { has: user.team_id } },
        select: { id: true },
      });
      allowedProjectIds = projects.map((p) => p.id);
    }

    const result = await getTasks({
      page,
      limit,
      search,
      status,
      priority,
      projectId,
      assignedTo,
      allowedProjectIds, // 👈 passer au filtre
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /tasks]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tâches" },
      { status: 500 }
    );
  }
}
