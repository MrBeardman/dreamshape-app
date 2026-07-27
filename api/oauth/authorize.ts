import { sign, verify, timingSafeStringCompare, type AuthCode, type RegisteredClient } from "../_lib/mcp/oauth.js";

// Authorization step of the OAuth flow claude.ai runs to obtain an MCP access token.
// Dreamshape is a client-side SPA with no server-readable session (the Supabase session
// lives only in browser localStorage), so unlike the other two apps this can't reuse a
// cookie-based login. Instead it's gated by a single shared passphrase (MCP_AUTHORIZE_PASSPHRASE)
// — good enough for a personal single-user app, and it doesn't require touching App.tsx.

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function renderForm(errorMessage?: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Dreamshape — Authorize</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 32px; width: 100%; max-width: 360px; box-sizing: border-box; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { color: #888; font-size: 13px; margin: 0 0 20px; }
  input { width: 100%; box-sizing: border-box; background: #222; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #fff; margin-bottom: 12px; }
  button { width: 100%; background: #f5c518; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; color: #111; cursor: pointer; }
  .error { background: #3a1a1a; border: 1px solid #703030; border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #f88; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Connect claude.ai to Dreamshape</h1>
    <p>Enter your Dreamshape passphrase to allow this connection.</p>
    ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
    <form method="POST">
      <input type="password" name="passphrase" placeholder="Passphrase" autofocus required />
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`;
}

type ValidatedRequest =
  | { ok: true; clientId: string; redirectUri: string; state: string; codeChallenge: string }
  | { ok: false; response: Response };

function validateRequest(url: URL): ValidatedRequest {
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "";

  const client = verify<RegisteredClient>(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return {
      ok: false,
      response: Response.json({ error: "invalid_request", error_description: "Unknown client_id or redirect_uri" }, { status: 400 }),
    };
  }

  if (responseType !== "code" || codeChallengeMethod !== "S256" || !codeChallenge) {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "invalid_request");
    if (state) errorUrl.searchParams.set("state", state);
    return { ok: false, response: Response.redirect(errorUrl.toString(), 302) };
  }

  return { ok: true, clientId, redirectUri, state, codeChallenge };
}

export async function GET(req: Request): Promise<Response> {
  const result = validateRequest(new URL(req.url));
  if (!result.ok) return result.response;
  return html(renderForm());
}

export async function POST(req: Request): Promise<Response> {
  const result = validateRequest(new URL(req.url));
  if (!result.ok) return result.response;

  const contentType = req.headers.get("content-type") ?? "";
  let passphrase = "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
  } else {
    const text = await req.text();
    passphrase = new URLSearchParams(text).get("passphrase") ?? "";
  }

  const expected = process.env.MCP_AUTHORIZE_PASSPHRASE;
  if (!expected || !passphrase || !timingSafeStringCompare(passphrase, expected)) {
    return html(renderForm("Incorrect passphrase — try again."), 401);
  }

  const code: AuthCode = {
    clientId: result.clientId,
    redirectUri: result.redirectUri,
    codeChallenge: result.codeChallenge,
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const target = new URL(result.redirectUri);
  target.searchParams.set("code", sign(code));
  if (result.state) target.searchParams.set("state", result.state);
  return Response.redirect(target.toString(), 302);
}
