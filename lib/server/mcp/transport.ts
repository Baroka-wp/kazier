/**
 * Adapter Next.js Route Handler ↔ MCP server (stateless, in-memory loopback).
 *
 * À chaque POST /api/mcp on :
 *   1. Authentifie via Bearer ApiKey
 *   2. Parse le payload JSON-RPC
 *   3. Crée un serveur MCP Kazier (avec l'Actor IA correspondant) et un client
 *      MCP interne reliés par un InMemoryTransport
 *   4. Route la méthode JSON-RPC vers l'API typée du Client SDK (listTools,
 *      callTool, ping…). Pas de passthrough générique car le SDK valide
 *      strictement les schemas de réponse.
 *   5. Renvoie la réponse JSON-RPC au format attendu par le client externe
 *   6. Ferme client + serveur
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createKazierMcpServer, KAZIER_MCP_SERVER_INFO } from "./server";
import { extractBearer, verifyBearer } from "./auth";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

// Liste des versions MCP qu'on supporte (la plus récente d'abord).
const SUPPORTED_MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";

export async function handleMcpRequest(req: Request): Promise<Response> {
  // ── 0. Validation MCP-Protocol-Version (spec 2025-06-18) ──────────────
  // Si le header est présent et qu'on ne supporte pas cette version, 400.
  // S'il est absent, on assume 2025-03-26 (rétrocompat).
  const protocolHeader = req.headers.get("mcp-protocol-version");
  if (protocolHeader && !SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(protocolHeader)) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: `Unsupported MCP-Protocol-Version: ${protocolHeader}. Supported: ${SUPPORTED_MCP_PROTOCOL_VERSIONS.join(", ")}`,
        },
        id: null,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // ── 1. Auth ───────────────────────────────────────────────────────────
  const token = extractBearer(req.headers);
  if (!token) return jsonRpcAuthError("Missing Bearer token", req);

  // RFC 8707 — l'URI canonique de notre MCP server. Le token OAuth doit
  // avoir été émis avec cette resource pour être accepté.
  const expectedResource = canonicalMcpUri(req);
  const authed = await verifyBearer(token, expectedResource);
  if (!authed) return jsonRpcAuthError("Invalid or expired token", req);

  // ── 2. Parse ───────────────────────────────────────────────────────────
  let payload: JsonRpcRequest | JsonRpcRequest[];
  try {
    payload = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400 }
    );
  }

  // ── 3. Server + client loopback ───────────────────────────────────────
  const server = createKazierMcpServer(authed.actor);
  const client = new Client({ name: "kazier-internal", version: "0.0.0" }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  // ── 4. Route les méthodes JSON-RPC vers l'API du Client ──────────────
  try {
    const requests = Array.isArray(payload) ? payload : [payload];
    const responses = await Promise.all(requests.map((r) => route(client, r)));
    const body = Array.isArray(payload) ? responses : responses[0];
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

async function route(client: Client, req: JsonRpcRequest): Promise<unknown> {
  const id = req.id ?? null;
  try {
    let result: unknown;
    switch (req.method) {
      case "initialize": {
        // Négociation de version : on prend la version demandée par le client
        // si on la supporte, sinon la nôtre par défaut (le client peut alors
        // décider de continuer ou abandonner).
        const requested = (req.params as { protocolVersion?: string } | undefined)?.protocolVersion;
        const negotiated =
          requested && SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(requested)
            ? requested
            : DEFAULT_MCP_PROTOCOL_VERSION;
        result = {
          protocolVersion: negotiated,
          capabilities: { tools: {} },
          serverInfo: KAZIER_MCP_SERVER_INFO,
        };
        break;
      }

      case "ping":
        result = await client.ping();
        break;

      case "tools/list":
        result = await client.listTools((req.params as { cursor?: string } | undefined) ?? {});
        break;

      case "tools/call":
        result = await client.callTool(req.params as Parameters<Client["callTool"]>[0]);
        break;

      default:
        if (req.method.startsWith("notifications/")) {
          // Notifications n'attendent pas de réponse. Conformément à JSON-RPC,
          // on ne devrait rien renvoyer pour les notifications — mais notre
          // route renvoie un array de réponses, donc on retourne juste {}.
          return { jsonrpc: "2.0", id };
        }
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
    return { jsonrpc: "2.0", id, result };
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: typeof err.code === "number" ? err.code : -32603,
        message: err.message ?? "Internal error",
      },
    };
  }
}

/**
 * URI canonique du MCP server, telle qu'utilisée pour le `resource` RFC 8707.
 * Format : "<scheme>://<host>/api/mcp" sans trailing slash, sans fragment.
 */
function canonicalMcpUri(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}/api/mcp`;
}

function jsonRpcAuthError(message: string, req: Request): Response {
  // RFC 9728 — pointer Claude.ai vers la métadonnée du resource server.
  // Derrière Coolify, on doit reconstruire l'URL externe via les headers
  // x-forwarded-* (le url.host est l'IP interne du container).
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const base = `${proto}://${host}`;
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource`;
  const wwwAuth =
    `Bearer realm="kazier-mcp", ` +
    `error="invalid_token", ` +
    `error_description="${message.replace(/"/g, "")}", ` +
    `resource_metadata="${resourceMetadata}"`;

  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message }, id: null }),
    {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": wwwAuth },
    }
  );
}
