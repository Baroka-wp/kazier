/**
 * Gestion des OAuthClient — Dynamic Client Registration (RFC 7591).
 *
 * Quand Claude.ai veut se brancher pour la 1re fois, il POST vers
 * /oauth/register avec son redirect_uri et reçoit un client_id.
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/core";

export type RegisteredClient = {
  clientId: string;
  clientSecret?: string; // émis une seule fois si non-public
  clientName: string | null;
  redirectUris: string[];
  isPublic: boolean;
};

export async function registerClient(input: {
  clientName?: string;
  redirectUris: string[];
  tokenEndpointAuthMethod?: string; // "none" pour public client
}): Promise<RegisteredClient> {
  const clientId = `kzc_app_${crypto.randomBytes(16).toString("hex")}`;
  const isPublic = (input.tokenEndpointAuthMethod ?? "none") === "none";

  let clientSecret: string | undefined;
  let clientSecretHash: string | null = null;
  if (!isPublic) {
    clientSecret = `kzs_${crypto.randomBytes(32).toString("hex")}`;
    clientSecretHash = await bcrypt.hash(clientSecret, 10);
  }

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientName: input.clientName ?? null,
      redirectUris: input.redirectUris,
      clientSecretHash,
      isPublic,
    },
  });

  return {
    clientId,
    clientSecret,
    clientName: input.clientName ?? null,
    redirectUris: input.redirectUris,
    isPublic,
  };
}

export async function getClient(clientId: string) {
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

export async function verifyClientCredentials(
  clientId: string,
  clientSecret: string | undefined
): Promise<boolean> {
  const c = await getClient(clientId);
  if (!c) return false;
  if (c.isPublic) return true; // pas de secret attendu
  if (!clientSecret || !c.clientSecretHash) return false;
  return bcrypt.compare(clientSecret, c.clientSecretHash);
}
