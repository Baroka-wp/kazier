import { NextRequest, NextResponse } from "next/server";
import { getProjects } from "@/lib/project-actions";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Non authentifié : Session manquante", { status: 401 });
  }
  const user = session.user as { id?: string; role?: string };
  const role = user?.role ?? null;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  // Un PROJECT_MANAGER ne voit que les projets dont il est membre.
  // Pour SUPER_ADMIN, on ne filtre pas.
  const teamId = role === "PROJECT_MANAGER" || role === "TM" ? user.id : undefined;

  const result = await getProjects({ page, limit, search, teamId });
  return Response.json(result);
}
