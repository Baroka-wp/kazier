/**
 * Auth codes éphémères (10 min TTL) + vérification PKCE S256.
 *
 * Format code : "kzc_<32 hex>". Stocké en clair (TTL court). Single-use.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/core";

const CODE_TTL_SEC = 10 * 60;

export async function issueAuthCode(params: {
  clientId: string;
  memberId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource?: string; // RFC 8707
}): Promise<string> {
  const code = `kzc_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000);
  await prisma.oAuthAuthCode.create({
    data: {
      code,
      clientId: params.clientId,
      memberId: params.memberId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      scope: params.scope,
      resource: params.resource,
      expiresAt,
    },
  });
  return code;
}

export type ResolvedCode = {
  id: string;
  memberId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  resource: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
};

export async function consumeAuthCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ResolvedCode | null> {
  const found = await prisma.oAuthAuthCode.findUnique({
    where: { code: params.code },
  });
  if (!found) return null;
  if (found.usedAt) return null;
  if (found.expiresAt < new Date()) return null;
  if (found.clientId !== params.clientId) return null;
  if (found.redirectUri !== params.redirectUri) return null;

  // PKCE verification
  if (!verifyPkce(params.codeVerifier, found.codeChallenge, found.codeChallengeMethod)) {
    return null;
  }

  // Mark used
  await prisma.oAuthAuthCode.update({
    where: { id: found.id },
    data: { usedAt: new Date() },
  });

  return {
    id: found.id,
    memberId: found.memberId,
    clientId: found.clientId,
    redirectUri: found.redirectUri,
    scope: found.scope,
    resource: found.resource,
    codeChallenge: found.codeChallenge,
    codeChallengeMethod: found.codeChallengeMethod,
  };
}

function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method === "plain") return verifier === challenge;
  if (method === "S256") {
    const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
    return computed === challenge;
  }
  return false;
}
