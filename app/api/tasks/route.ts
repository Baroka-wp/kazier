import { NextResponse } from "next/server";
import { getTasks } from "@/lib/task-actions";

export async function GET(request: Request) {
  try {
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

    const result = await getTasks({
      page,
      limit,
      search,
      status,
      priority,
      projectId,
      assignedTo
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
