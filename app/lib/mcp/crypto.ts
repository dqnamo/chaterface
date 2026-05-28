import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const algorithm = "aes-256-gcm";

export function createSecureToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecureToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptMcpValue(value: unknown) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptMcpValue<T>(value?: null | string) {
  if (!value) {
    return undefined;
  }

  const [ivValue, tagValue, ciphertextValue] = value.split(".");

  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Encrypted MCP value is invalid");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(ivValue, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as T;
}

function getEncryptionKey() {
  const value = process.env.MCP_TOKEN_ENCRYPTION_KEY;

  if (!value) {
    throw new Error("MCP_TOKEN_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(value, "base64");

  if (key.length === 32) {
    return key;
  }

  if (value.length >= 32) {
    return createHash("sha256").update(value).digest();
  }

  throw new Error("MCP_TOKEN_ENCRYPTION_KEY must be at least 32 bytes");
}
