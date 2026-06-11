// app/api/teams/route.ts
//
// Endpoint public-with-key — utilisé par des intégrations externes (Zapier,
// scripts internes, etc.) pour lister les membres.
//
// Pour l'instant l'auth se fait via la table legacy `api_keys` (clé en clair).
// Migration vers ApiKey hashée + scopes prévue en Phase 3 (MCP).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core";

export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get("api_key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key manquante. Ajoute ?api_key=... à l'URL." },
      { status: 401 }
    );
  }

  // Lookup dans la table legacy via SQL brut (la table existe encore en DB)
  const keyRecords = await prisma.$queryRaw<
    Array<{ id: number; key: string; is_active: boolean }>
  >`SELECT id, key, is_active FROM api_keys WHERE key = ${apiKey} LIMIT 1`;

  const keyRecord = keyRecords[0];
  if (!keyRecord || !keyRecord.is_active) {
    return NextResponse.json({ error: "API key invalide ou désactivée." }, { status: 403 });
  }

  // last_used non-bloquant
  prisma
    .$executeRaw`UPDATE api_keys SET last_used = NOW() WHERE id = ${keyRecord.id}`.catch(
    () => {}
  );

  const members = await prisma.member.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      email: true,
      phone: true,
      age: true,
      slackId: true,
      isBoss: true,
      createdAt: true,
    },
    orderBy: { firstName: "asc" },
  });

  // Préserver le shape historique (snake_case) pour les consommateurs externes
  const data = members.map((m) => ({
    id: m.id,
    first_name: m.firstName,
    last_name: m.lastName,
    role: m.role,
    email: m.email,
    phone: m.phone,
    age: m.age,
    slack_id: m.slackId,
    is_boss: m.isBoss,
    created_at: m.createdAt,
  }));

  return NextResponse.json({ data, count: data.length });
}
