import "dotenv/config";
import "./env.js"; // must run before the database client is created
import { createApp } from "./app.js";
import { prisma } from "./db.js";

const port = Number(process.env.PORT) || 3001;
const app = createApp();

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[dreamshape] listening on 0.0.0.0:${port}`);
});

async function shutdown(signal: string) {
  console.log(`[dreamshape] ${signal}, shutting down`);
  server.close();
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("[dreamshape] unhandled rejection:", reason instanceof Error ? reason.message : reason);
});
