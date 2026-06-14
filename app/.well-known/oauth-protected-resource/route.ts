/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Annoncé par /api/mcp via WWW-Authenticate sur 401. Permet à Claude.ai de
 * découvrir l'AS à utiliser pour s'authentifier.
 */

export const runtime = "nodejs";

function origin(req: Request): string {
  const proto =
    req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? new URL(req.url).origin;
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
