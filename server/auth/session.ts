import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Signed session cookie. Replaces Supabase Auth's browser-held JWT.
 *
 * Cookie value = base64url(JSON payload) + "." + HMAC-SHA256(payload), signed with
 * SESSION_SECRET. Nothing is stored server-side: a cookie that verifies and hasn't expired
 * is the session. Rotating SESSION_SECRET logs every device out.
 *
 * The cookie is renewed (sliding window) when it is older than a day, so a device that is
 * used regularly stays signed in, like Supabase's refresh token did.
 */

export const SESSION_COOKIE = "ds_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const RENEW_AFTER_SECONDS = 60 * 60 * 24;

export type Session = { uid: string; iat: number; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function createSessionToken(uid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = { uid, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  try {
    if (!safeEqual(sig, sign(body))) return null;
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (typeof session.uid !== "string" || typeof session.exp !== "number" || typeof session.iat !== "number") return null;
    if (session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function setSessionCookie(req: Request, res: Response, uid: string): void {
  res.cookie(SESSION_COOKIE, createSessionToken(uid), {
    httpOnly: true,
    secure: req.secure, // true behind Hostinger's HTTPS proxy (trust proxy is on), false on http://localhost
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: req.secure, sameSite: "lax", path: "/" });
}

/** The session of this request, or null. Never throws on a bad cookie. */
export function getSession(req: Request): Session | null {
  return verifySessionToken(readCookie(req, SESSION_COOKIE));
}

/**
 * Guard for /api routes that need a signed-in user. Puts the user id on res.locals.userId.
 * The id always comes from the signed cookie, never from the request body or query.
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.locals.userId = session.uid;
  if (Math.floor(Date.now() / 1000) - session.iat > RENEW_AFTER_SECONDS) setSessionCookie(req, res, session.uid);
  next();
}

export function currentUserId(res: Response): string {
  return res.locals.userId as string;
}
