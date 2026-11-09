require("dotenv").config();
const crypto = require("crypto");
const { Pool } = require("pg");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const ENCRYPTED_PREFIX = "enc:v1:";

const deriveKey = (secret) => {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return crypto.createHash("sha256").update(secret).digest();
};

const decryptWithKey = (envelope, keyBuffer) => {
  if (!envelope || typeof envelope !== "string" || !envelope.startsWith(ENCRYPTED_PREFIX)) {
    return envelope;
  }
  const rawPayload = envelope.slice(ENCRYPTED_PREFIX.length);
  const [ivHex, tagHex, ciphertextHex] = rawPayload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const encryptWithKey = (plaintext, keyBuffer) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(String(plaintext), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

async function main() {
  const currentSecret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  const newSecret = process.argv[2];

  console.log("==================================================");
  console.log(" EchoServer AES-256-GCM Key Rotation Tool");
  console.log("==================================================");

  if (!currentSecret) {
    console.error("❌ Error: No current ENCRYPTION_KEY found in environment or .env file.");
    process.exit(1);
  }

  if (!newSecret) {
    const suggestedKey = crypto.randomBytes(32).toString("hex");
    console.log("Usage: node scripts/rotate-encryption-key.js <NEW_64_HEX_KEY>");
    console.log("\nGenerated Suggested New Key (64-character hex):");
    console.log(`\n  ${suggestedKey}\n`);
    console.log(`To rotate, run:`);
    console.log(`  node scripts/rotate-encryption-key.js ${suggestedKey}`);
    process.exit(0);
  }

  if (newSecret === currentSecret) {
    console.error("❌ Error: The new key is identical to the current key.");
    process.exit(1);
  }

  const currentKeyBuffer = deriveKey(currentSecret);
  const newKeyBuffer = deriveKey(newSecret);

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "echo_db",
    user: process.env.DB_USER || "echo_user",
    password: process.env.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    console.log("Connecting to database and fetching environment variables...");
    const { rows } = await client.query(
      `SELECT id, project_id, key, value FROM environment_variables WHERE value LIKE '${ENCRYPTED_PREFIX}%'`,
    );

    console.log(`Found ${rows.length} encrypted environment variable(s) to re-encrypt.`);

    if (rows.length === 0) {
      console.log("✓ No existing encrypted records to re-encrypt. You can safely update ENCRYPTION_KEY in .env.");
      process.exit(0);
    }

    await client.query("BEGIN");

    let count = 0;
    for (const row of rows) {
      const plaintext = decryptWithKey(row.value, currentKeyBuffer);
      const reEncrypted = encryptWithKey(plaintext, newKeyBuffer);

      await client.query(
        `UPDATE environment_variables SET value = $1 WHERE id = $2`,
        [reEncrypted, row.id],
      );
      count++;
    }

    await client.query("COMMIT");
    console.log(`✓ SUCCESS: Successfully re-encrypted ${count} record(s) with the new encryption key.`);
    console.log("\nNext Steps:");
    console.log(`1. Update backend/.env with:`);
    console.log(`   ENCRYPTION_KEY=${newSecret}`);
    console.log(`2. Restart backend: docker compose -f docker-compose.prod.yml restart backend`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Key rotation failed and rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

