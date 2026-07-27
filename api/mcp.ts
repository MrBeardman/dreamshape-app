import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerMcpTools } from "./_lib/mcp/tools.js";

const handler = createMcpHandler(
  (server) => registerMcpTools(server),
  { serverInfo: { name: "dreamshape", version: "1.0.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: process.env.NODE_ENV !== "production" }
);

const authedHandler = withMcpAuth(
  handler,
  (req, bearerToken) => {
    const expected = process.env.MCP_AUTH_TOKEN;
    if (!expected) return undefined;
    if (bearerToken !== expected) return undefined;
    return { token: bearerToken, clientId: "dreamshape-owner", scopes: [] };
  },
  { required: true }
);

export const GET = authedHandler;
export const POST = authedHandler;
export const DELETE = authedHandler;
