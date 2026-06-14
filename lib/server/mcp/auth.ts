/**
 * Auth MCP — accepte deux types de Bearer :
 *   1. ApiKey statique "kz_..." (générée via scripts/generate-api-key.ts)
 *   2. OAuth access token "kzo_..." (issued par /oauth/token)
 *
 * Retourne un Actor IA construit avec les scopes appropriés.
 */

import bcrypt from "bcryptjs";
import { prisma, type Actor } from "@/lib/core";
import { verifyAccessToken } from "@/lib/server/oauth/tokens";
import { parseScope } from "@/lib/server/oauth/scopes";

export type AuthenticatedActor = {
  actor: Actor;
  source: "api_key" | "oauth";
  sourceId: string;
};

export async function verifyBearer(token: string | null): Promise<AuthenticatedActor | null> {
  if (!token) return null;

  if (token.startsWith("kzo_")) return verifyOAuthToken(token);
  if (token.startsWith("kz_")) return verifyApiKey(token);
  return null;
}

async function verifyApiKey(token: string): Promise<AuthenticatedActor | null> {
  if (!/^kz_[a-f0-9]+$/i.test(token) || token.length < 16) return null;
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
      prisma.apiKey
        .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      const actor: Actor = {
        type: "IA",
        apiKeyId: c.id,
        scopes: c.scopes,
      };
      return { actor, source: "api_key", sourceId: c.id };
    }
  }
  return null;
}

async function verifyOAuthToken(token: string): Promise<AuthenticatedActor | null> {
  const resolved = await verifyAccessToken(token);
  if (!resolved) return null;

  const scopes = parseScope(resolved.scope);
  const actor: Actor = {
    type: "IA",
    apiKeyId: resolved.id, // on réutilise le slot apiKeyId pour traçabilité
    scopes,
    memberId: resolved.memberId,
  };
  return { actor, source: "oauth", sourceId: resolved.id };
}

/** Extrait le bearer token d'un header Authorization. */
export function extractBearer(headers: Headers): string | null {
  const h = headers.get("authorization") ?? headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}
