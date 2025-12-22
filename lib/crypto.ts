/**
 * Simple utilities for storing sensitive data
 */

// Local storage keys
const LOCAL_API_KEY = "chaterface_openrouter_api_key";

/**
 * Get API key from local storage
 */
export function getLocalApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_API_KEY);
}

/**
 * Set API key in local storage
 */
export function setLocalApiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_API_KEY, apiKey);
  // Dispatch custom event to notify hooks
  window.dispatchEvent(new Event("local-api-key-change"));
}

/**
 * Remove API key from local storage
 */
export function removeLocalApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_API_KEY);
  // Dispatch custom event to notify hooks
  window.dispatchEvent(new Event("local-api-key-change"));
}


