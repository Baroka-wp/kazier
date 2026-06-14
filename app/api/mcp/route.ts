/**
 * MCP endpoint — Streamable HTTP transport stateless.
 *
 *   POST /api/mcp
 *     Authorization: Bearer kz_... | kzo_...
 *     Content-Type: application/json
 *     Accept: application/json, text/event-stream
 *
 *     { "jsonrpc": "2.0", "method": "tools/list", "id": 1 }
 *
 * Conforme à la spec MCP Streamable HTTP (2025-06-18). Pas de session
 * persistante côté serveur, pas de SSE (on retourne juste application/json).
 */

import { handleMcpRequest } from "@/lib/server/mcp/transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

/**
 * GET sur l'endpoint MCP : la spec dit que si le serveur n'offre pas de
 * server-initiated SSE stream, il DOIT retourner 405 Method Not Allowed.
 * On n'a pas de stream serveur→client (stateless), donc 405.
 */
export async function GET(): Promise<Response> {
  return new Response(null, {
    status: 405,
    headers: { allow: "POST", "cache-control": "no-store" },
  });
}

/**
 * DELETE pour terminer une session. Comme on est stateless (pas de
 * Mcp-Session-Id), on retourne 405.
 */
export async function DELETE(): Promise<Response> {
  return new Response(null, {
    status: 405,
    headers: { allow: "POST", "cache-control": "no-store" },
  });
}
