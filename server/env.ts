// Fail fast, with a readable message, when the deployment is missing something essential.
// Imported first in index.ts (ES modules evaluate imports in order), before the database
// client is created.

const problems: string[] = [];

if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is not set (mysql://user:password@127.0.0.1:3306/database)");
else if (!/^mysql:\/\//.test(process.env.DATABASE_URL)) problems.push("DATABASE_URL must start with mysql://");

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  problems.push("SESSION_SECRET must be set to a random string of at least 32 characters (openssl rand -hex 32)");
}

if (problems.length > 0) {
  console.error("[dreamshape] Cannot start:\n - " + problems.join("\n - "));
  process.exit(1);
}

if (!process.env.MCP_AUTH_TOKEN) {
  console.warn("[dreamshape] MCP_AUTH_TOKEN is not set: /api/mcp and the OAuth shim will reject every request.");
}
if (!process.env.MCP_AUTHORIZE_PASSPHRASE) {
  console.warn("[dreamshape] MCP_AUTHORIZE_PASSPHRASE is not set: the connector's /api/oauth/authorize step cannot succeed.");
}

export {};
