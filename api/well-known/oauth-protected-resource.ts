import { generateProtectedResourceMetadata, getPublicUrl, metadataCorsOptionsRequestHandler } from "mcp-handler";

export async function GET(req: Request) {
  const origin = getPublicUrl(req).origin;
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  });
  return Response.json(metadata, { headers: { "Cache-Control": "max-age=3600" } });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
