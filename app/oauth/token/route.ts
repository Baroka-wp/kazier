/**
 * POST /oauth/token
 *
 * Échange un authorization code (avec PKCE verifier) contre des tokens,
 * ou refresh un access token expiré.
 *
 * Content-Type: application/x-www-form-urlencoded (standard OAuth)
 * Body (auth_code):
 *   grant_type=authorization_code
 *   code=kzc_...
 *   redirect_uri=...
 *   client_id=...
 *   code_verifier=...
 * Body (refresh):
 *   grant_type=refresh_token
 *   refresh_token=kzr_...
 *   client_id=...
 *
 * Réponse 200 :
 *   { access_token, token_type: "Bearer", expires_in, refresh_token, scope }
 */

import { NextResponse } from "next/server";
import { consumeAuthCode } from "@/lib/server/oauth/codes";
import { issueTokens, rotateRefreshToken } from "@/lib/server/oauth/tokens";
import { verifyClientCredentials } from "@/lib/server/oauth/clients";
import { scopesForRole, formatScope } from "@/lib/server/oauth/scopes";
import { prisma } from "@/lib/core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let params: URLSearchParams;
  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      params = new URLSearchParams(body);
    } else if (ct.includes("application/json")) {
      const json = await req.json();
      params = new URLSearchParams(
        Object.entries(json).map(([k, v]) => [k, String(v)])
      );
    } else {
      return errResp("invalid_request", "Unsupported content type");
    }
  } catch {
    return errResp("invalid_request", "Malformed body");
  }

  const grantType = params.get("grant_type");
  const clientId = params.get("client_id") ?? "";
  const clientSecret = params.get("client_secret") ?? undefined;

  // Vérifie le client (public ou confidentiel)
  if (!(await verifyClientCredentials(clientId, clientSecret))) {
    return errResp("invalid_client", "Unknown client or invalid credentials", 401);
  }

  if (grantType === "authorization_code") {
    return handleAuthCode(params, clientId);
  }
  if (grantType === "refresh_token") {
    return handleRefresh(params);
  }
  return errResp("unsupported_grant_type", `Unsupported grant_type: ${grantType}`);
}

async function handleAuthCode(params: URLSearchParams, clientId: string) {
  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const codeVerifier = params.get("code_verifier");

  if (!code || !redirectUri || !codeVerifier) {
    return errResp("invalid_request", "code, redirect_uri, code_verifier required");
  }

  const consumed = await consumeAuthCode({ code, clientId, redirectUri, codeVerifier });
  if (!consumed) {
    return errResp("invalid_grant", "Invalid, expired or already-used code");
  }

  // Récupère le rôle du Member pour calculer les scopes
  const member = await prisma.member.findUnique({
    where: { id: consumed.memberId },
    select: { role: true, isActive: true },
  });
  if (!member || !member.isActive) {
    return errResp("invalid_grant", "Member not found or inactive");
  }

  // Si le client a demandé un scope spécifique, on intersecte avec ce que
  // le rôle autorise. Sinon, on donne tous les scopes du rôle.
  const allowedScopes = scopesForRole(member.role);
  const requestedScopes =
    consumed.scope.trim().length > 0 ? consumed.scope.split(/\s+/) : allowedScopes;
  const effectiveScopes = requestedScopes.filter((s) => allowedScopes.includes(s));

  const tokens = await issueTokens({
    clientId,
    memberId: consumed.memberId,
    scope: formatScope(effectiveScopes),
  });

  return NextResponse.json({
    access_token: tokens.accessToken,
    token_type: "Bearer",
    expires_in: tokens.accessExpiresIn,
    refresh_token: tokens.refreshToken,
    scope: formatScope(effectiveScopes),
  }, { headers: { "cache-control": "no-store" } });
}

async function handleRefresh(params: URLSearchParams) {
  const refresh = params.get("refresh_token");
  if (!refresh) return errResp("invalid_request", "refresh_token required");

  const tokens = await rotateRefreshToken(refresh);
  if (!tokens) return errResp("invalid_grant", "Invalid or expired refresh_token");

  // Récupère le scope du token précédent (déjà rotated, on lit le nouveau)
  // → simple : on retrouve par le hash de l'access fraîchement émis
  // Pour rester simple, on ne retourne pas le scope (Claude n'en a pas besoin
  // pour refresh, il le sait déjà)

  return NextResponse.json({
    access_token: tokens.accessToken,
    token_type: "Bearer",
    expires_in: tokens.accessExpiresIn,
    refresh_token: tokens.refreshToken,
  }, { headers: { "cache-control": "no-store" } });
}

function errResp(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "cache-control": "no-store" } }
  );
}
