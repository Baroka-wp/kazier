/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 * Annonce les endpoints OAuth de Kazier. Claude.ai discovery part d'ici.
 */

export const runtime = "nodejs";

function origin(req: Request): string {
  const url = new URL(req.url);
  return process.env.AUTH_URL ?? `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const base = origin(req);
  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    scopes_supported: [
      "members:read",
      "members:write",
      "projects:read",
      "projects:write",
      "projects:finance",
      "tasks:read",
      "tasks:write",
      "deliverables:read",
      "deliverables:write",
      "reports:read",
      "reports:write",
      "reports:delete",
      "expenses:read",
      "expenses:write",
      "notes:read",
      "notes:write",
      "audit:read",
    ],
    service_documentation: `${base}/api/mcp`,
  }, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
