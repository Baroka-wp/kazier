/**
 * POST /oauth/authorize/confirm
 *
 * Reçoit la décision allow/deny du formulaire de consentement.
 * Sur allow : émet un OAuthAuthCode et retourne l'URL de redirection
 * vers redirect_uri avec ?code=... &state=...
 * Sur deny : retourne l'URL de redirection avec ?error=access_denied
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core";
import { issueAuthCode } from "@/lib/server/oauth/codes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: {
    decision: "allow" | "deny";
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state: string;
    scope: string;
    resource?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const redirectUrl = new URL(body.redirectUri);
  if (body.state) redirectUrl.searchParams.set("state", body.state);

  if (body.decision === "deny") {
    redirectUrl.searchParams.set("error", "access_denied");
    redirectUrl.searchParams.set("error_description", "User denied consent");
    return NextResponse.json({ redirectTo: redirectUrl.toString() });
  }

  // Vérifier le client (sécu défense en profondeur)
  const client = await prisma.oAuthClient.findUnique({ where: { clientId: body.clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client inconnu" }, { status: 400 });
  }
  if (!client.redirectUris.includes(body.redirectUri)) {
    return NextResponse.json({ error: "redirect_uri invalide" }, { status: 400 });
  }

  const code = await issueAuthCode({
    clientId: body.clientId,
    memberId: user.id,
    redirectUri: body.redirectUri,
    codeChallenge: body.codeChallenge,
    codeChallengeMethod: body.codeChallengeMethod,
    scope: body.scope,
    resource: body.resource || undefined,
  });

  redirectUrl.searchParams.set("code", code);
  return NextResponse.json({ redirectTo: redirectUrl.toString() });
}
