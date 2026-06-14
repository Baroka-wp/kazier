/**
 * Émission, vérification et révocation des tokens OAuth.
 *
 * Format access token : "kzo_<32 hex>" (256 bits d'entropie).
 * Format refresh token : "kzr_<32 hex>".
 *
 * Stockage : bcrypt hash. On indexe par les 8 premiers chars (prefix)
 * comme pour les ApiKey, pour le lookup rapide.
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/core";

const ACCESS_TTL_SEC = 60 * 60;             // 1h
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30;  // 30j

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
};

function randomToken(prefix: "kzo" | "kzr"): string {
  return `${prefix}_${crypto.randomBytes(32).toString("hex")}`;
}

export async function issueTokens(params: {
  clientId: string;
  memberId: string;
  scope: string;
  resource?: string | null; // RFC 8707 — bound audience
}): Promise<IssuedTokens> {
  const accessToken = randomToken("kzo");
  const refreshToken = randomToken("kzr");

  const accessHash = await bcrypt.hash(accessToken, 10);
  const refreshHash = await bcrypt.hash(refreshToken, 10);

  const now = new Date();
  const accessExpires = new Date(now.getTime() + ACCESS_TTL_SEC * 1000);
  const refreshExpires = new Date(now.getTime() + REFRESH_TTL_SEC * 1000);

  await prisma.oAuthToken.create({
    data: {
      accessTokenHash: accessHash,
      refreshTokenHash: refreshHash,
      clientId: params.clientId,
      memberId: params.memberId,
      scope: params.scope,
      resource: params.resource ?? null,
      accessExpiresAt: accessExpires,
      refreshExpiresAt: refreshExpires,
    },
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: ACCESS_TTL_SEC,
    refreshExpiresIn: REFRESH_TTL_SEC,
  };
}

export type ResolvedToken = {
  id: string;
  memberId: string;
  clientId: string;
  scope: string;
  resource: string | null;
};

/**
 * Vérifie un access token. Retourne les claims si valide, null sinon.
 * On scan les tokens non révoqués et non expirés en lookup par bcrypt
 * (volumes faibles : quelques dizaines/centaines de tokens actifs max
 * sur Kazier).
 */
export async function verifyAccessToken(token: string): Promise<ResolvedToken | null> {
  if (!token.startsWith("kzo_") || token.length < 16) return null;

  const candidates = await prisma.oAuthToken.findMany({
    where: {
      revokedAt: null,
      accessExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      accessTokenHash: true,
      memberId: true,
      clientId: true,
      scope: true,
      resource: true,
    },
  });

  for (const c of candidates) {
    if (await bcrypt.compare(token, c.accessTokenHash)) {
      // last_used non-bloquant
      prisma.oAuthToken
        .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return {
        id: c.id,
        memberId: c.memberId,
        clientId: c.clientId,
        scope: c.scope,
        resource: c.resource,
      };
    }
  }
  return null;
}

/**
 * Échange un refresh token contre une nouvelle paire access/refresh.
 * Le refresh token est révoqué dans la foulée (rotation).
 */
export async function rotateRefreshToken(refreshToken: string): Promise<IssuedTokens | null> {
  if (!refreshToken.startsWith("kzr_")) return null;

  const candidates = await prisma.oAuthToken.findMany({
    where: {
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() },
      refreshTokenHash: { not: null },
    },
    select: {
      id: true,
      refreshTokenHash: true,
      memberId: true,
      clientId: true,
      scope: true,
      resource: true,
    },
  });

  for (const c of candidates) {
    if (!c.refreshTokenHash) continue;
    if (await bcrypt.compare(refreshToken, c.refreshTokenHash)) {
      // Révoque l'ancien
      await prisma.oAuthToken.update({
        where: { id: c.id },
        data: { revokedAt: new Date() },
      });
      // Émet une nouvelle paire avec la même resource binding
      return issueTokens({
        clientId: c.clientId,
        memberId: c.memberId,
        scope: c.scope,
        resource: c.resource,
      });
    }
  }
  return null;
}

export async function revokeToken(token: string): Promise<boolean> {
  const candidates = await prisma.oAuthToken.findMany({
    where: { revokedAt: null },
    select: { id: true, accessTokenHash: true, refreshTokenHash: true },
  });
  for (const c of candidates) {
    const matchAccess = await bcrypt.compare(token, c.accessTokenHash);
    const matchRefresh =
      c.refreshTokenHash && (await bcrypt.compare(token, c.refreshTokenHash));
    if (matchAccess || matchRefresh) {
      await prisma.oAuthToken.update({
        where: { id: c.id },
        data: { revokedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}
