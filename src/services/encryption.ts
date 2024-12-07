import crypto from "crypto";
import { BadRequestError } from "../errors";

// Generate a random key and IV for demonstration purposes
const algorithm = "aes-256-cbc";

const key =
  Buffer.from(process.env.ENCRYPTION_KEY!, "hex") || crypto.randomBytes(32); // 32 bytes key
const iv =
  Buffer.from(process.env.ENCRYPTION_IV!, "hex") || crypto.randomBytes(16); // 16 bytes IV

// Function to encrypt dat

function encrypt(data: string) {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (err) {
    return false;
  }
}

// Function to decrypt data
interface DecryptParams {
  encryptedData: string;
  ivHex: string;
  keyHex: string;
}

function decrypt({ encryptedData, ivHex, keyHex }: DecryptParams): string {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(keyHex, "hex"),
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export { encrypt, decrypt };
