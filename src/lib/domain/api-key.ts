// Public API keys (docs/PRD.md §4.6): "hu_" + 32 base62 characters. Randomness is passed in (crypto bytes).
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const KEY_BODY_LENGTH = 32;
export const API_KEY_PREFIX_LENGTH = 8;
export const API_KEY_PATTERN = /^hu_[0-9A-Za-z]{32}$/;

export function generateApiKey(randomBytes: Uint8Array): string {
  if (randomBytes.length < KEY_BODY_LENGTH) throw new Error(`generateApiKey needs ${KEY_BODY_LENGTH} random bytes.`);
  let body = "";
  for (let i = 0; i < KEY_BODY_LENGTH; i += 1) body += BASE62[(randomBytes[i] ?? 0) % BASE62.length];
  return `hu_${body}`;
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX_LENGTH);
}
