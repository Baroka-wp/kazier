// app/api/teams/route.ts
//
// Endpoint public-with-key — utilisé par des intégrations externes pour
// lister les membres. Auth via ApiKey V2 (Bearer ou ?api_key=).
// Préserve le shape externe historique (snake_case).

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/core";

export const runtime = "nodejs";

async function verifyApiKey(token: string): Promise<boolean> {
  if (!/^kz_[a-f0-9]+$/i.test(token) || token.length < 16) return false;
  const prefix = token.slice(0, 8);
  const candidates = await prisma.apiKey.findMany({
    where: {
      prefix,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, keyHash: true, scopes: true },
  });
  for (const c of candidates) {
    if (await bcrypt.compare(token, c.keyHash)) {
      // Ne donne accès qu'aux clés qui ont le scope members:read ou *
      if (c.scopes.includes("*") || c.scopes.includes("members:read")) {
        prisma.apiKey
          .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {});
        return true;
      }
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  // Accept token in Authorization: Bearer or ?api_key=
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
  const token = bearerMatch?.[1] ?? req.nextUrl.searchParams.get("api_key");

  if (!token) {
    return NextResponse.json(
      { error: "API key manquante (Bearer or ?api_key=)" },
      { status: 401 }
    );
  }
  const ok = await verifyApiKey(token);
  if (!ok) {
    return NextResponse.json(
      { error: "API key invalide ou scope insuffisant (members:read requis)" },
      { status: 403 }
    );
  }

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
