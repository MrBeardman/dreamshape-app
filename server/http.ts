import type { ErrorRequestHandler } from "express";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Validate untrusted input. Throws HttpError(400) with a readable message. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    throw new HttpError(400, `Invalid request (${detail})`);
  }
  return result.data;
}

function isDbDown(err: unknown): boolean {
  const e = err as { name?: string; code?: string; message?: string; cause?: { code?: string } } | null;
  if (!e) return false;
  const code = e.code ?? e.cause?.code ?? "";
  if (["P1000", "P1001", "P1002", "P1008", "P1017", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ER_ACCESS_DENIED_ERROR"].includes(code)) return true;
  return /PrismaClientInitializationError|pool timeout|pool failed to retrieve a connection|ECONNREFUSED|Can't reach database|Access denied/i.test(`${e.name} ${e.message}`);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // body-parser errors (malformed JSON, payload too large)
  const status = (err as { status?: number }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Request too large" : "Invalid request" });
    return;
  }
  console.error("[api] unhandled error:", err instanceof Error ? `${err.name}: ${err.message}` : err);
  if (isDbDown(err)) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }
  res.status(500).json({ error: "Server error" });
};
