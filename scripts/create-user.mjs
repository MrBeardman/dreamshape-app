// Creates a user (users row + profiles row) directly in the database.
// Usage: node scripts/create-user.mjs you@example.com "password" ["Display name"] [creator|tester|member]
// Needs DATABASE_URL (mysql://...) in the environment or .env.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mariadb from "mariadb";

const [email, password, name = "User", role = "member"] = process.argv.slice(2);
if (!email || !password || !["creator", "tester", "member"].includes(role)) {
  console.error('Usage: node scripts/create-user.mjs you@example.com "password" ["Display name"] [creator|tester|member]');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const conn = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  timezone: "Z",
});

try {
  const id = randomUUID();
  await conn.beginTransaction();
  await conn.query("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [id, email.toLowerCase(), bcrypt.hashSync(password, 12)]);
  await conn.query("INSERT INTO profiles (id, name, role) VALUES (?, ?, ?)", [id, name, role]);
  await conn.commit();
  console.log(`Created ${email.toLowerCase()} (${id}).`);
} catch (err) {
  await conn.rollback().catch(() => {});
  console.error("Failed:", err.code === "ER_DUP_ENTRY" ? "that email already exists" : err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
