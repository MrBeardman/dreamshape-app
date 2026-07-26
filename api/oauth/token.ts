import { verify, verifyPkce, type AuthCode } from "../_lib/mcp/oauth";

const EXPIRES_IN = 34560000; // ~400 days; this is a personal single-user server, not worth rotating often

async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, string>;
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

function tokenResponse() {
  return Response.json({
    access_token: process.env.MCP_AUTH_TOKEN,
    token_type: "Bearer",
    expires_in: EXPIRES_IN,
    refresh_token: process.env.MCP_AUTH_TOKEN,
  });
}

export async function POST(req: Request) {
  const body = await parseBody(req);

  if (body.grant_type === "authorization_code") {
    const payload = body.code ? verify<AuthCode>(body.code) : null;
    if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
      return Response.json({ error: "invalid_grant", error_description: "Code is invalid or expired" }, { status: 400 });
    }
    if (body.client_id && body.client_id !== payload.clientId) {
      return Response.json({ error: "invalid_grant", error_description: "client_id mismatch" }, { status: 400 });
    }
    if (body.redirect_uri && body.redirect_uri !== payload.redirectUri) {
      return Response.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
    }
    if (!body.code_verifier || !verifyPkce(body.code_verifier, payload.codeChallenge, "S256")) {
      return Response.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
    }
    return tokenResponse();
  }

  if (body.grant_type === "refresh_token") {
    if (body.refresh_token !== process.env.MCP_AUTH_TOKEN) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    return tokenResponse();
  }

  return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
}
