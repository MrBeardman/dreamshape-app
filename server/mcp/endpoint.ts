import { timingSafeEqual } from "node:crypto";
import express, { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerMcpTools } from "./tools.js";
import { getPublicOrigin } from "./publicUrl.js";
import * as authorize from "./authorize.js";
import * as register from "./register.js";
import * as token from "./token.js";
import * as wellKnownAuthServer from "./wellKnownAuthServer.js";
import * as wellKnownResource from "./wellKnownResource.js";

/**
 * MCP endpoint + the OAuth shim claude.ai uses to get a token for it. Same paths as on Vercel:
 *   /api/mcp                                  Streamable HTTP MCP endpoint (Bearer MCP_AUTH_TOKEN)
 *   /api/oauth/{authorize,register,token}     OAuth 2.1 shim
 *   /.well-known/oauth-protected-resource     discovery
 *   /.well-known/oauth-authorization-server   discovery
 *
 * The OAuth handlers are plain Web `Request -> Response` functions (unchanged from the Vercel
 * version); `adapt` bridges them to Express.
 */
export const mcpRouter = Router();

// ─── Web Request/Response <-> Express ────────────────────────────────────────────────────────
type WebHandler = (req: Request) => Response | Promise<Response>;

function toWebRequest(req: ExpressRequest): Request {
  const url = `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && Buffer.isBuffer(req.body) && req.body.length > 0;
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
  });
}

async function sendWebResponse(res: ExpressResponse, webRes: Response): Promise<void> {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  const body = Buffer.from(await webRes.arrayBuffer());
  res.end(body);
}

function adapt(handler: WebHandler) {
  return async (req: ExpressRequest, res: ExpressResponse) => {
    await sendWebResponse(res, await handler(toWebRequest(req)));
  };
}

// OAuth endpoints take form-encoded or JSON bodies; hand them the raw bytes.
const rawBody = express.raw({ type: () => true, limit: "100kb" });
const noStore = (_req: ExpressRequest, res: ExpressResponse, next: () => void) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

// ─── OAuth shim ──────────────────────────────────────────────────────────────────────────────
mcpRouter.get("/api/oauth/authorize", noStore, adapt(authorize.GET));
mcpRouter.post("/api/oauth/authorize", noStore, rawBody, adapt(authorize.POST));
mcpRouter.post("/api/oauth/register", noStore, rawBody, adapt(register.POST));
mcpRouter.post("/api/oauth/token", noStore, rawBody, adapt(token.POST));

// Discovery. The path-suffixed variants (RFC 9728 / 8414) are served by the same handlers.
const wellKnown: [string, { GET: WebHandler; OPTIONS: WebHandler }][] = [
  ["/.well-known/oauth-protected-resource", wellKnownResource],
  ["/.well-known/oauth-protected-resource/api/mcp", wellKnownResource],
  ["/.well-known/oauth-authorization-server", wellKnownAuthServer],
  ["/.well-known/oauth-authorization-server/api/mcp", wellKnownAuthServer],
];
for (const [path, mod] of wellKnown) {
  mcpRouter.get(path, adapt(mod.GET));
  mcpRouter.options(path, adapt(mod.OPTIONS));
}

// ─── MCP endpoint ────────────────────────────────────────────────────────────────────────────
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Mirrors mcp-handler's withMcpAuth({ required: true }): 401 + WWW-Authenticate pointing at the
// protected-resource metadata, which is how claude.ai discovers the OAuth flow.
function requireMcpToken(req: ExpressRequest, res: ExpressResponse, next: () => void): void {
  const [type, bearer] = (req.get("authorization") ?? "").split(" ");
  const supplied = type?.toLowerCase() === "bearer" ? bearer : undefined;
  const expected = process.env.MCP_AUTH_TOKEN;
  if (expected && supplied && safeEqual(supplied, expected)) {
    next();
    return;
  }
  const origin = getPublicOrigin(toWebRequest(req));
  const description = "No authorization provided";
  res
    .status(401)
    .set("WWW-Authenticate", `Bearer error="invalid_token", error_description="${description}", resource_metadata="${origin}/.well-known/oauth-protected-resource"`)
    .json({ error: "invalid_token", error_description: description });
}

const methodNotAllowed = (_req: ExpressRequest, res: ExpressResponse) => {
  res
    .status(405)
    .set("Allow", "POST")
    .json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
};

// Stateless: a fresh server + transport per request, plain JSON responses (no SSE), as before.
mcpRouter.post("/api/mcp", requireMcpToken, express.json({ limit: "4mb" }), async (req, res) => {
  const server = new McpServer({ name: "dreamshape", version: "1.0.0" });
  registerMcpTools(server);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp] request failed:", err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});
mcpRouter.get("/api/mcp", requireMcpToken, methodNotAllowed);
mcpRouter.delete("/api/mcp", requireMcpToken, methodNotAllowed);
