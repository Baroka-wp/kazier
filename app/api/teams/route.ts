// app/api/teams/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // ── 1. Vérification de l'API key ──────────────────────────────────────────
  const apiKey = req.nextUrl.searchParams.get("api_key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key manquante. Ajoute ?api_key=... à l'URL." },
      { status: 401 }
    );
  }

  const keyRecord = await prisma.api_keys.findUnique({
    where: { key: apiKey },
  });

  if (!keyRecord || !keyRecord.is_active) {
    return NextResponse.json({ error: "API key invalide ou désactivée." }, { status: 403 });
  }

  // Mise à jour du last_used (non-bloquant)
  prisma.api_keys
    .update({
      where: { id: keyRecord.id },
      data: { last_used: new Date() },
    })
    .catch(() => {});

  // ── 2. Récupération des données ───────────────────────────────────────────
  const teams = await prisma.teams.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      role: true,
      email: true,
      phone: true,
      age: true,
      slack_id: true,
      is_boss: true,
      created_at: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ data: teams, count: teams.length });
}
