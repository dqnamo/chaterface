/**
 * Simple encryption utilities for storing sensitive data
 * Uses Web Crypto API with AES-GCM encryption
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

// Generate a key from a password/secret
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Use a fixed salt for deterministic key derivation
  // In a real app, you'd want to store a unique salt per user
  const salt = encoder.encode("chaterface-v1-salt");

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using AES-GCM
 * @param plaintext - The text to encrypt
 * @param secret - The secret key (e.g., user ID)
 * @returns Base64 encoded encrypted string with IV prepended
 */
export async function encrypt(
  plaintext: string,
  secret: string
): Promise<string> {
  const key = await deriveKey(secret);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a string that was encrypted with encrypt()
 * @param ciphertext - Base64 encoded encrypted string
 * @param secret - The secret key used for encryption
 * @returns The decrypted plaintext
 */
export async function decrypt(
  ciphertext: string,
  secret: string
): Promise<string> {
  const key = await deriveKey(secret);

  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Local storage keys
const LOCAL_API_KEY = "chaterface_openrouter_api_key";

/**
 * Get API key from local storage (for non-authenticated users)
 */
export function getLocalApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_API_KEY);
}

/**
 * Set API key in local storage (for non-authenticated users)
 */
export function setLocalApiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_API_KEY, apiKey);
}

/**
 * Remove API key from local storage
 */
export function removeLocalApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_API_KEY);
}


