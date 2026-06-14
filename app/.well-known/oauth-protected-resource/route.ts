/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Annoncé par /api/mcp via WWW-Authenticate sur 401. Permet à Claude.ai de
 * découvrir l'AS à utiliser pour s'authentifier.
 */

export const runtime = "nodejs";

function origin(req: Request): string {
  const url = new URL(req.url);
  return process.env.AUTH_URL ?? `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const base = origin(req);
  return Response.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: [
      "members:read", "members:write",
      "projects:read", "projects:write", "projects:finance",
      "tasks:read", "tasks:write",
      "deliverables:read", "deliverables:write",
      "reports:read", "reports:write", "reports:delete",
      "expenses:read", "expenses:write",
      "notes:read", "notes:write",
      "audit:read",
    ],
  }, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
