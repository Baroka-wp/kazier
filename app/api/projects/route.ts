import { NextRequest } from "next/server";
import { getProjects } from "@/lib/project-actions";
import { auth } from "@/auth";
import { isTeamManager } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string; team_id?: number };
  const role = user?.role ?? null;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  // SA → teamId = undefined → voit tout
  // TM → teamId = son team_id → voit seulement ses projets
  const teamId = isTeamManager(role) ? user?.team_id : undefined;

  const result = await getProjects({ page, limit, search, teamId });

  return Response.json(result);
}
