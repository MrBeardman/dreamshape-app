import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { requireUser } from "./auth/session.js";
import { errorHandler } from "./http.js";
import { authRouter } from "./routes/auth.js";
import { dataRouter } from "./routes/data.js";
import { mcpRouter } from "./mcp/endpoint.js";

// server/ in dev (tsx), dist-server/ in production: either way the Vite build is ../dist.
const distDir = path.resolve(import.meta.dirname, "../dist");

function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
}

function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store");
  next();
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true); // Hostinger terminates TLS in front of the Node process
  app.use(securityHeaders);

  app.get("/healthz", (_req, res) => {
    res.type("text/plain").send("ok");
  });

  // MCP endpoint, OAuth shim and /.well-known documents (own body parsing, own auth).
  app.use(mcpRouter);

  // JSON API for the web app.
  app.use("/api", noStore, express.json({ limit: "1mb" }));
  app.use("/api/auth", authRouter);
  app.use("/api", requireUser, dataRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // The Vite build, with SPA fallback.
  const indexHtml = path.join(distDir, "index.html");
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // hashed file names
        } else {
          res.setHeader("Cache-Control", "no-cache"); // index.html, sw.js, manifest.json, icons
        }
      },
    })
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    // A missing file with an extension is a real 404; serving index.html for it would hand
    // HTML to a <script> tag after a deploy.
    if (path.extname(req.path) !== "" || req.path.startsWith("/.well-known/")) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    if (!fs.existsSync(indexHtml)) {
      res.status(404).type("text/plain").send("Frontend not built. Run `npm run build` (or use `npm run dev`).");
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });

  app.use(errorHandler);
  return app;
}
