import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// A minimal, stateless OAuth 2.1 authorization server for the MCP connector.
// There's only ever one real user and one real credential (MCP_AUTH_TOKEN), so instead of
// persisting registered clients / auth codes in the database, client_ids and codes are
// self-contained: base64url(JSON payload) + "." + HMAC-SHA256(payload) signed with
// MCP_AUTH_TOKEN as the key. Anything that verifies here was therefore issued by this
// server and hasn't been tampered with, with zero storage.

function secret(): string {
  const value = process.env.MCP_AUTH_TOKEN;
  if (!value) throw new Error("MCP_AUTH_TOKEN is not set");
  return value;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verify<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (!timingSafeStringEqual(signature, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return timingSafeStringEqual(hash, codeChallenge);
}

export function timingSafeStringCompare(a: string, b: string): boolean {
  return timingSafeStringEqual(a, b);
}

export type RegisteredClient = { redirectUris: string[]; name?: string };
export type AuthCode = { clientId: string; redirectUri: string; codeChallenge: string; exp: number };
