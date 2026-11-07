const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // 96 bits recommended for AES-GCM
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Derives a strictly 32-byte Buffer key for AES-256-GCM.
 */
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: ENCRYPTION_KEY is required in production for securing secrets at rest.",
      );
    }
    // Development fallback
    return crypto
      .createHash("sha256")
      .update("echo-default-development-encryption-key-2026")
      .digest();
  }

  // If a 64-character hex string was provided (32 bytes), parse directly
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  // Otherwise, deterministically hash with SHA-256 to produce exactly 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Checks if a string has already been encrypted with the version 1 envelope.
 */
const isEncrypted = (value) => {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
};

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Stored format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
const encrypt = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  const strValue = String(value);

  // Avoid double encryption if already encrypted
  if (isEncrypted(strValue)) {
    return strValue;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(strValue, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM encrypted envelope.
 * Returns legacy plaintext strings as-is for backward compatibility.
 */
const decrypt = (value) => {
  if (value === null || value === undefined || typeof value !== "string") {
    return value;
  }

  // Backward compatibility: If not encrypted with our envelope, return as-is
  if (!isEncrypted(value)) {
    return value;
  }

  try {
    const rawPayload = value.slice(ENCRYPTED_PREFIX.length);
    const parts = rawPayload.split(":");

    if (parts.length !== 3) {
      console.warn("[CryptoUtil] Malformed encrypted payload structure");
      return value;
    }

    const [ivHex, tagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error(
      "[CryptoUtil] Decryption integrity failure (tampered data or wrong ENCRYPTION_KEY):",
      err.message,
    );
    throw new Error(
      "Failed to decrypt secret: integrity check failed or corrupted secret data.",
    );
  }
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  getEncryptionKey,
};

