import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * MySQL / MariaDB on Hostinger. The app is one long-lived Node process there, so a small
 * pool is fine.
 *
 * DATABASE_URL format: mysql://user:password@127.0.0.1:3306/database
 * (use 127.0.0.1, not "localhost": localhost can resolve to ::1 and not every DB user has that grant)
 */
function createPrisma(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 5_000,
    // Store and read DATETIME as UTC, whatever the server's time zone is.
    timezone: "Z",
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;

export { Prisma } from "@prisma/client";
