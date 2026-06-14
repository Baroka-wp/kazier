/**
 * RFC 7591 — Dynamic Client Registration.
 *
 * POST /oauth/register
 *   { redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
 *     client_name: "Claude",
 *     token_endpoint_auth_method: "none" }
 *
 * Réponse 201 :
 *   { client_id: "kzc_app_...",
 *     redirect_uris: [...], client_name: "Claude",
 *     token_endpoint_auth_method: "none" }
 */

import { NextResponse } from "next/server";
import { registerClient } from "@/lib/server/oauth/clients";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    redirect_uris?: string[];
    client_name?: string;
    token_endpoint_auth_method?: string;
  };
  try {
    body = await req.json();
  } catch {
    return errResp("invalid_client_metadata", "Invalid JSON body");
  }

  if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return errResp("invalid_redirect_uri", "redirect_uris required");
  }

  // Validation basique des URIs (https sauf localhost)
  for (const uri of body.redirect_uris) {
    try {
      const u = new URL(uri);
      if (
        u.protocol !== "https:" &&
        !(u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))
      ) {
        return errResp("invalid_redirect_uri", `redirect_uri must be HTTPS: ${uri}`);
      }
    } catch {
      return errResp("invalid_redirect_uri", `malformed redirect_uri: ${uri}`);
    }
  }

  const registered = await registerClient({
    clientName: body.client_name,
    redirectUris: body.redirect_uris,
    tokenEndpointAuthMethod: body.token_endpoint_auth_method,
  });

  return NextResponse.json(
    {
      client_id: registered.clientId,
      ...(registered.clientSecret ? { client_secret: registered.clientSecret } : {}),
      client_name: registered.clientName,
      redirect_uris: registered.redirectUris,
      token_endpoint_auth_method: registered.isPublic ? "none" : "client_secret_post",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}

function errResp(error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status: 400, headers: { "cache-control": "no-store" } }
  );
}
