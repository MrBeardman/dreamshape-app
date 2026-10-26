// One-off: copy every row from the old Supabase Postgres DB into the new MySQL/MariaDB DB.
//
// Prerequisites:
//   1. The MySQL schema exists:  npm run db:deploy   (prisma migrate deploy, DATABASE_URL = MySQL)
//   2. Both URLs are set in the environment (or .env):
//        SOURCE_DATABASE_URL = postgresql://...supabase.com:5432/postgres   (old, read only use)
//        DATABASE_URL        = mysql://user:pass@host:3306/db               (new)
//
// Usage:  node scripts/copy-from-supabase.mjs            (refuses if the target already has rows)
//         node scripts/copy-from-supabase.mjs --replace  (empties the target tables first)
//
// What it does
//   - Tables and columns are read from the *target* schema, so the script follows whatever the
//     Prisma migrations created. Columns missing in the source (e.g. custom_exercises.tracking_mode)
//     get their default.
//   - auth.users -> users: id, email (lower-cased), encrypted_password -> password_hash (the bcrypt
//     hash is copied as is, so the existing password keeps working), created_at, updated_at.
//   - profiles.role falls back to auth.users.raw_user_meta_data->>'role' when it is empty
//     (the old app preferred the metadata role).
//   - jsonb / numeric / date values are copied as exact text, timestamps as UTC instants.
//   - Everything runs in one transaction with foreign key checks off; row counts and foreign keys
//     are verified before COMMIT, otherwise it rolls back and the target stays untouched.
//   - It only ever reads from Postgres. It never prints credentials or password hashes.

import "dotenv/config";
import pg from "pg";
import mariadb from "mariadb";

const replace = process.argv.includes("--replace");
const src = process.env.SOURCE_DATABASE_URL;
const dst = process.env.DATABASE_URL;
if (!src || !dst) {
  console.error("Set SOURCE_DATABASE_URL (Postgres) and DATABASE_URL (MySQL).");
  process.exit(1);
}
if (!/^mysql:\/\//.test(dst)) {
  console.error("DATABASE_URL must be a mysql:// URL (the target).");
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(src)) {
  console.error("SOURCE_DATABASE_URL must be a postgresql:// URL (the Supabase source).");
  process.exit(1);
}

const dstUrl = new URL(dst);
const srcUrl = new URL(src);
const dbName = dstUrl.pathname.replace(/^\//, "");
console.log(`Source: Postgres ${srcUrl.hostname}${srcUrl.pathname}  ->  Target: MySQL ${dstUrl.hostname}:${dstUrl.port || 3306}/${dbName}${replace ? "  (--replace)" : ""}`);

// Exact copies: no float conversion for numerics, no timezone guessing for plain dates.
pg.types.setTypeParser(1700, (v) => v); // numeric
pg.types.setTypeParser(3802, (v) => v); // jsonb
pg.types.setTypeParser(114, (v) => v); // json
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1114, (v) => new Date(v.replace(" ", "T") + "Z")); // timestamp without tz: stored as UTC

const pgClient = new pg.Client({ connectionString: src, ssl: { rejectUnauthorized: false } });
const my = await mariadb.createConnection({
  host: dstUrl.hostname,
  port: Number(dstUrl.port || 3306),
  user: decodeURIComponent(dstUrl.username),
  password: decodeURIComponent(dstUrl.password),
  database: dbName,
  timezone: "Z",
  connectTimeout: 15000,
});
await pgClient.connect();

const report = [];
let failed = false;

try {
  const tables = (
    await my.query(
      `SELECT TABLE_NAME AS t FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'
       ORDER BY TABLE_NAME`,
      [dbName]
    )
  ).map((r) => r.t);

  const pgTables = new Set(
    (await pgClient.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).rows.map(
      (r) => r.table_name
    )
  );

  await my.query("SET FOREIGN_KEY_CHECKS = 0");
  await my.beginTransaction();

  for (const t of tables) {
    const isUsers = t === "users";
    if (!isUsers && !pgTables.has(t)) {
      report.push({ table: t, source: "-", copied: 0, note: "not in source, skipped" });
      continue;
    }

    // Writable target columns only.
    const cols = (
      await my.query(
        `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND EXTRA NOT LIKE '%GENERATED%' AND EXTRA NOT LIKE '%VIRTUAL%'
         ORDER BY ORDINAL_POSITION`,
        [dbName, t]
      )
    ).map((r) => r.c);

    let selectSql;
    let shared;
    let missing = [];

    if (isUsers) {
      // Supabase Auth -> users. The hash is selected but never printed.
      shared = ["id", "email", "password_hash", "created_at", "updated_at"].filter((c) => cols.includes(c));
      const expr = {
        id: "id::text AS id",
        email: "lower(email) AS email",
        password_hash: "COALESCE(encrypted_password, '') AS password_hash",
        created_at: "created_at",
        updated_at: "COALESCE(updated_at, created_at) AS updated_at",
      };
      selectSql = `SELECT ${shared.map((c) => expr[c]).join(", ")} FROM auth.users ORDER BY created_at`;
    } else {
      const pgCols = new Set(
        (
          await pgClient.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
            [t]
          )
        ).rows.map((r) => r.column_name)
      );
      shared = cols.filter((c) => pgCols.has(c));
      missing = cols.filter((c) => !pgCols.has(c));
      if (t === "profiles" && shared.includes("role")) {
        const list = shared.map((c) =>
          c === "role"
            ? `CASE WHEN COALESCE(p.role, u.raw_user_meta_data->>'role') IN ('creator','tester','member') THEN COALESCE(p.role, u.raw_user_meta_data->>'role') END AS role`
            : `p."${c}"`
        );
        selectSql = `SELECT ${list.join(", ")} FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id`;
      } else {
        selectSql = `SELECT ${shared.map((c) => `"${c}"`).join(", ")} FROM public."${t}"`;
      }
    }

    const [{ n: existing }] = await my.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    if (Number(existing) > 0) {
      if (!replace) throw new Error(`Target table ${t} already has ${existing} rows. Re-run with --replace to overwrite.`);
      await my.query(`DELETE FROM \`${t}\``);
    }

    const { rows } = await pgClient.query(selectSql);

    const colList = shared.map((c) => `\`${c}\``).join(", ");
    const placeholders = `(${shared.map(() => "?").join(", ")})`;
    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = chunk.flatMap((row) => shared.map((c) => row[c]));
      await my.query(`INSERT INTO \`${t}\` (${colList}) VALUES ${chunk.map(() => placeholders).join(", ")}`, values);
    }

    const [{ n: after }] = await my.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    const ok = Number(after) === rows.length;
    if (!ok) failed = true;
    report.push({
      table: t,
      source: rows.length,
      copied: Number(after),
      note: [ok ? "" : "COUNT MISMATCH", missing.length ? `defaults used for: ${missing.join(", ")}` : ""].filter(Boolean).join("; "),
    });
  }

  // Foreign keys were off during the copy: make sure nothing is orphaned.
  const fks = await my.query(
    `SELECT k.TABLE_NAME AS t, k.COLUMN_NAME AS c, k.REFERENCED_TABLE_NAME AS rt, k.REFERENCED_COLUMN_NAME AS rc
     FROM information_schema.KEY_COLUMN_USAGE k
     WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    [dbName]
  );
  for (const { t, c, rt, rc } of fks) {
    const [{ n }] = await my.query(
      `SELECT COUNT(*) AS n FROM \`${t}\` x LEFT JOIN \`${rt}\` r ON x.\`${c}\` = r.\`${rc}\` WHERE x.\`${c}\` IS NOT NULL AND r.\`${rc}\` IS NULL`
    );
    if (Number(n) > 0) {
      failed = true;
      report.push({ table: t, source: "-", copied: "-", note: `${n} row(s) with ${c} not found in ${rt}.${rc}` });
    }
  }

  if (failed) {
    await my.rollback();
    console.error("\nProblems found, rolled back. The target is unchanged.");
  } else {
    await my.commit();
  }
} catch (err) {
  failed = true;
  try {
    await my.rollback();
  } catch {
    /* nothing to roll back */
  }
  console.error("\nCopy stopped, rolled back:", err.message);
} finally {
  try {
    await my.query("SET FOREIGN_KEY_CHECKS = 1");
  } catch {
    /* connection already gone */
  }
  await my.end().catch(() => {});
  await pgClient.end().catch(() => {});
}

console.table(report);
if (failed) {
  console.error("Finished with problems, see above.");
  process.exit(1);
}
console.log("All tables copied, row counts match, no orphaned foreign keys.");
