import { NextResponse } from "next/server";
import { getTeamsData } from "@/lib/equipe-actions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;

    const result = await getTeamsData({
      page,
      limit,
      search,
      role
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
