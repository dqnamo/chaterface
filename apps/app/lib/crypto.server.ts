import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const algorithm = "aes-256-gcm";

export function encryptSecretValue(value: unknown) {
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

export function decryptSecretValue<T>(value?: null | string) {
  if (!value) {
    return undefined;
  }

  const [ivValue, tagValue, ciphertextValue] = value.split(".");

  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Encrypted value is invalid");
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
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
  const value =
    process.env.FACTORY_AUTH_ENCRYPTION_KEY ??
    process.env.INSTANT_APP_ADMIN_TOKEN ??
    process.env.INSTANT_ADMIN_TOKEN;

  if (!value) {
    throw new Error(
      "FACTORY_AUTH_ENCRYPTION_KEY or Instant admin token is required",
    );
  }

  const base64Key = Buffer.from(value, "base64");

  if (base64Key.length === 32) {
    return base64Key;
  }

  if (value.length >= 32) {
    return createHash("sha256").update(value).digest();
  }

  throw new Error("Encryption key must be at least 32 bytes");
}
