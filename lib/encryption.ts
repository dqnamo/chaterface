import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

// 1. Generate Key
// We generate a simple random string token as the key
export async function generateMasterKey(): Promise<string> {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 2. Import Key
// With crypto-js, the key is just a string (password).
// We handle potential legacy JWK JSON strings just in case.
export async function importMasterKey(jsonKey: string): Promise<string> {
  try {
     // If it's a legacy JWK string, try to extract something unique
     // But realistically, AES-GCM JWK keys aren't compatible with simple password-based AES.
     // So we just return the string as-is. If decryption fails, the fallback handles it.
     return jsonKey;
  } catch {
     return jsonKey;
  }
}

// 3. Encrypt
export async function encryptData(text: string, key: string): Promise<string> {
  if (!text) return "";
  return AES.encrypt(text, key).toString();
}

// 4. Decrypt
export async function decryptData(cipherText: string, key: string): Promise<string> {
  if (!cipherText) return "";
  
  try {
    const bytes = AES.decrypt(cipherText, key);
    const originalText = bytes.toString(encUtf8);
    
    // If decryption "succeeds" but produces empty string from non-empty input
    // (which can happen with crypto-js on wrong keys sometimes), or if it failed
    // to produce utf8, we assume failure.
    if (!originalText && cipherText.length > 0) return cipherText;
    
    return originalText;
  } catch {
    // Fallback to original text (legacy unencrypted data)
    return cipherText;
  }
}
