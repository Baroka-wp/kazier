/**
 * Auth MCP — vérifie un Bearer token contre la table ApiKey (clé hashée bcrypt),
 * retourne l'Actor IA correspondant ou null.
 *
 * Format token attendu : "kz_<hex64>" (généré par scripts/generate-api-key.ts).
 * On lookup par prefix (8 premiers char en clair stockés dans ApiKey.prefix),
 * puis bcrypt.compare sur la clé complète. Évite un scan de toute la table.
 */

import bcrypt from "bcryptjs";
import { prisma, type Actor } from "@/lib/core";

export type AuthenticatedActor = {
  actor: Actor;
  apiKeyId: string;
};

export async function verifyBearer(token: string | null): Promise<AuthenticatedActor | null> {
  if (!token) return null;

  // Format de base : kz_<64 hex>. Le prefix stocké en DB est key.slice(0, 8)
  // (= "kz_" + 5 hex char), pour identifier rapidement sans révéler la clé.
  if (!/^kz_[a-f0-9]+$/i.test(token) || token.length < 16) return null;
  const prefix = token.slice(0, 8);

  // Toutes les clés actives avec ce prefix (en général une seule)
  const candidates = await prisma.apiKey.findMany({
    where: {
      prefix,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, keyHash: true, scopes: true },
  });

  for (const c of candidates) {
    const match = await bcrypt.compare(token, c.keyHash);
    if (!match) continue;

    // Mise à jour lastUsedAt (non-bloquant)
    prisma.apiKey
      .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    const actor: Actor = {
      type: "IA",
      apiKeyId: c.id,
      scopes: c.scopes,
    };
    return { actor, apiKeyId: c.id };
  }

  return null;
}

/** Extrait le bearer token d'un header Authorization (ou null si absent/mal formé). */
export function extractBearer(headers: Headers): string | null {
  const h = headers.get("authorization") ?? headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}
