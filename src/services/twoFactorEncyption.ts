import { warn } from "console";
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY = (process.env.TWOFA_ENCRYPTION_KEY || "").padEnd(32).slice(0, 32);

if (!process.env.TWOFA_ENCRYPTION_KEY) {
  console.warn(
    "TWOFA_ENCRYPTION_KEY is not set. TOTP secrets will be insecure. Set TWOFA_ENCRYPTION_KEY in .env"
  );
}

const encryptTwoFA = (plain: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString(
    "base64"
  )}:${encrypted.toString("base64")}`;
};

const decryptTwoFA = (payload: string): string => {
  if (!payload) return "";
  const [ivB64, authTagB64, encryptedB64] = payload.split(":");

  if (!ivB64 || !authTagB64 || !encryptedB64) return "";

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(KEY), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
};

export { encryptTwoFA, decryptTwoFA };
