import { NextResponse } from "next/server";
import { getTeamsData } from "@/lib/equipe-actions";
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
    const roleFilter = searchParams.get("role") || undefined;

    // 👇 Si TM, récupérer les team_ids de ses projets
    let allowedTeamIds: number[] | undefined = undefined;
    if (isTeamManager(role) && user?.team_id) {
      const projects = await prisma.project.findMany({
        where: { team_ids: { has: user.team_id } },
        select: { team_ids: true },
      });
      const ids = [...new Set(projects.flatMap((p) => p.team_ids))];
      allowedTeamIds = ids;
    }

    const result = await getTeamsData({
      page,
      limit,
      search,
      role: roleFilter,
      allowedTeamIds, // 👈 passer au filtre
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /equipe]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'équipe" },
      { status: 500 }
    );
  }
}
