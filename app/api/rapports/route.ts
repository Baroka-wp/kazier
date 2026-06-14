import { NextResponse } from "next/server";
import { getRapportsData } from "@/lib/rapports-actions";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    //Vérification de l'authentification
    const session = await auth();
    if (!session) {
      return new NextResponse("Non authentifié : Session manquante", { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const dateFilter = searchParams.get("dateFilter") || undefined;

    const result = await getRapportsData({
      page,
      limit,
      search,
      role,
      projectId,
      dateFilter,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /rapports]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des rapports" },
      { status: 500 }
    );
  }
}
