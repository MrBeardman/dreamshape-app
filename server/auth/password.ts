import { scrypt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Password hashes in users.password_hash come in two formats:
 *  - bcrypt ("$2a$..." / "$2b$..."): what Supabase Auth stored, copied over by
 *    scripts/copy-from-supabase.mjs so the existing password keeps working.
 *  - scrypt ("saltHex:hashHex", 64-byte key): same format the other apps use.
 * New hashes (signup, scripts/hash-password.mjs) are bcrypt.
 */

// Compared against when the user is unknown or the hash is unusable, so a missing account
// costs as much time as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("dreamshape-dummy-password", 10);

function scryptKey(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, length, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const hash = stored ?? "";
  if (/^\$2[aby]\$/.test(hash)) {
    return bcrypt.compare(password, hash);
  }
  const [saltHex, hashHex] = hash.split(":");
  if (saltHex && hashHex && /^[0-9a-f]+$/i.test(saltHex) && /^[0-9a-f]+$/i.test(hashHex)) {
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scryptKey(password, Buffer.from(saltHex, "hex"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
}

export async function burnPasswordTime(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
