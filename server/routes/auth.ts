import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma, Prisma } from "../db.js";
import { burnPasswordTime, hashPassword, verifyPassword } from "../auth/password.js";
import { clearSessionCookie, getSession, setSessionCookie } from "../auth/session.js";

export const authRouter = Router();

type AuthUser = { id: string; email: string; createdAt: string; role?: string };

const emailSchema = z.string().trim().min(3).max(255).email();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(1024),
  name: z.string().trim().max(255).optional(),
  signupCode: z.string().max(255),
});

// --- crude brute-force guard: 10 failed logins per IP per 15 minutes ---------------------------
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

function throttled(req: Request): boolean {
  const entry = failures.get(req.ip ?? "?");
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(req.ip ?? "?");
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(req: Request): void {
  const key = req.ip ?? "?";
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt < now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toAuthUser(user: { id: string; email: string; createdAt: Date; profile: { role: string | null } | null }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    ...(user.profile?.role ? { role: user.profile.role } : {}),
  };
}

function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

async function login(req: Request, res: import("express").Response) {
  if (throttled(req)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { profile: true } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordTime(password), false);
  if (!user || !ok) {
    recordFailure(req);
    await sleep(600); // slow down guessing
    res.status(401).json({ error: "Invalid login credentials" });
    return;
  }

  setSessionCookie(req, res, user.id);
  res.json({ user: toAuthUser(user) });
}

authRouter.post(["/", "/login"], login);

authRouter.post("/signup", async (req, res) => {
  const expected = process.env.AUTH_SIGNUP_CODE;
  if (!expected) {
    res.status(403).json({ error: "Sign-up is disabled." });
    return;
  }
  if (throttled(req)) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email, a password of at least 6 characters and the signup code." });
    return;
  }
  const { email, password, name, signupCode } = parsed.data;
  if (!safeStringEqual(signupCode.trim().toUpperCase(), expected.trim().toUpperCase())) {
    recordFailure(req);
    res.status(403).json({ error: "Invalid signup code. DreamShape is currently in testing." });
    return;
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    // Same as the old handle_new_user trigger: every account gets a profiles row.
    // Signups are testers, as before.
    const user = await prisma.user.create({
      data: {
        id,
        email: email.toLowerCase(),
        passwordHash,
        profile: { create: { name: name || "User", role: "tester" } },
      },
      include: { profile: true },
    });
    setSessionCookie(req, res, user.id);
    res.status(201).json({ user: toAuthUser(user) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "User already registered" });
      return;
    }
    throw err;
  }
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

// 200 with {user: null} when signed out, so the app can tell "no session" from "server down".
authRouter.get("/session", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.json({ user: null });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid }, include: { profile: true } });
  if (!user) {
    clearSessionCookie(req, res);
    res.json({ user: null });
    return;
  }
  res.json({ user: toAuthUser(user) });
});
