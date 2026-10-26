// Small replacements for the helpers the Vercel-only `mcp-handler` package used to provide.
// Behaviour copied from mcp-handler 1.1.0 so the OAuth discovery documents stay identical.

function parseForwardedHeader(forwarded: string): { host?: string; proto?: string } {
  const result: { host?: string; proto?: string } = {};
  const firstElement = forwarded.split(",")[0];
  for (const pair of firstElement.split(";")) {
    const [key, value] = pair.split("=").map((s) => s.trim().toLowerCase());
    if (key === "host" && value) result.host = value.replace(/^"|"$/g, "");
    else if (key === "proto" && value) result.proto = value.replace(/^"|"$/g, "");
  }
  return result;
}

/** Origin the client used (honours the reverse proxy's X-Forwarded-* headers). */
export function getPublicOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = forwardedProto?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }
  const forwarded = req.headers.get("forwarded");
  if (forwarded) {
    const parsed = parseForwardedHeader(forwarded);
    if (parsed.host) return `${parsed.proto || "https"}://${parsed.host}`;
  }
  return new URL(req.url).origin;
}

export function getPublicUrl(req: Request): URL {
  const url = new URL(req.url);
  return new URL(url.pathname + url.search + url.hash, getPublicOrigin(req));
}

export function generateProtectedResourceMetadata({ authServerUrls, resourceUrl }: { authServerUrls: string[]; resourceUrl: string }) {
  return { resource: resourceUrl, authorization_servers: authServerUrls };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export function metadataCorsOptionsRequestHandler() {
  return () => new Response(null, { status: 200, headers: corsHeaders });
}
