import { sign, type RegisteredClient } from "../_lib/mcp/oauth.js";

// RFC 7591 Dynamic Client Registration. Since there's only ever one real user, there's
// nothing to persist per-client — the returned client_id is itself a signed token
// encoding the redirect_uris the caller registered, verified later in /authorize and /token.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const redirectUris: string[] = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u: unknown) => typeof u === "string") : [];

  if (redirectUris.length === 0) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
      { status: 400 }
    );
  }

  const client: RegisteredClient = { redirectUris, name: typeof body.client_name === "string" ? body.client_name : undefined };
  const clientId = sign(client);

  return Response.json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201 }
  );
}
