import { NextResponse } from "next/server";
import { getTasks } from "@/lib/task-actions";
import { auth } from "@/auth";
import { projects as projectsCore } from "@/lib/core";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) redirect("/login");

    const user = session.user as { id?: string; role?: string };
    const role = user?.role ?? null;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;

    // Si PM, on restreint aux projets dont il est membre
    let allowedProjectIds: string[] | undefined;
    if ((role === "PROJECT_MANAGER" || role === "TM") && user?.id) {
      const projList = await projectsCore.list(
        { type: "HUMAN", memberId: user.id, role: "PROJECT_MANAGER" },
        { memberId: user.id, limit: 100 }
      );
      if (projList.ok) allowedProjectIds = projList.data.data.map((p) => p.id);
    }

    const result = await getTasks({
      page,
      limit,
      search,
      status,
      priority,
      projectId,
      assignedTo,
      allowedProjectIds,
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
