/**
 * MCP endpoint — Streamable HTTP transport stateless.
 *
 *   POST /api/mcp
 *     Authorization: Bearer kz_<token>
 *     Content-Type: application/json
 *
 *     { "jsonrpc": "2.0", "method": "tools/list", "id": 1 }
 *
 * Pas de cookies, pas de session NextAuth — auth via Bearer ApiKey
 * lookup'd contre la table ApiKey (bcrypt-hashée).
 */

import { handleMcpRequest } from "@/lib/server/mcp/transport";

export const runtime = "nodejs"; // important : pas Edge (le SDK MCP utilise node:stream)
export const dynamic = "force-dynamic"; // pas de cache, chaque requête est unique

export async function POST(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

// Optionnel : GET pour permettre aux clients de tester l'auth sans rien casser
export async function GET(): Promise<Response> {
  return Response.json(
    {
      message: "Kazier MCP server. POST JSON-RPC payloads with Bearer ApiKey.",
      docs: "See @modelcontextprotocol/sdk for client usage.",
    },
    { headers: { "cache-control": "no-store" } }
  );
}
