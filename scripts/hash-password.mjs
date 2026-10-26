// Prints a password hash for users.password_hash (bcrypt, same family Supabase used).
// Usage: node scripts/hash-password.mjs "your password"
//        node scripts/hash-password.mjs --scrypt "your password"   (saltHex:hashHex, also accepted by the server)
import { randomBytes, scryptSync } from "node:crypto";
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
const useScrypt = args.includes("--scrypt");
const password = args.find((a) => a !== "--scrypt");
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs [--scrypt] "your password"');
  process.exit(1);
}

if (useScrypt) {
  const salt = randomBytes(16);
  console.log(`${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`);
} else {
  console.log(bcrypt.hashSync(password, 12));
}
