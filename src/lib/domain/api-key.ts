// Public API keys (docs/PRD.md §4.6): "hu_" + 32 base62 characters. Randomness is passed in (a crypto byte source).
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const KEY_BODY_LENGTH = 32;
export const API_KEY_PREFIX_LENGTH = 8;
export const API_KEY_PATTERN = /^hu_[0-9A-Za-z]{32}$/;

// 248 = 4 × 62: bytes below it map evenly onto BASE62; 248–255 would favour "0"–"7", so they are skipped (#63).
const UNBIASED_LIMIT = Math.floor(256 / BASE62.length) * BASE62.length;

/** `nextBytes(size)` returns `size` random bytes, like `crypto.randomBytes`; it is called until 32 characters exist. */
export function generateApiKey(nextBytes: (size: number) => Uint8Array): string {
  let body = "";
  while (body.length < KEY_BODY_LENGTH) {
    for (const byte of nextBytes(KEY_BODY_LENGTH)) {
      if (byte >= UNBIASED_LIMIT) continue;
      body += BASE62[byte % BASE62.length];
      if (body.length === KEY_BODY_LENGTH) break;
    }
  }
  return `hu_${body}`;
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX_LENGTH);
}
