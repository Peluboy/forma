/**
 * Share identifiers (Phase 6, Part E).
 *
 * - Unlisted templates get a hard-to-guess `shareToken` that can be revoked or
 *   regenerated.
 * - Public templates get a stable, collision-checked `publicId` slug that never
 *   exposes internal owner ids or raw database ids.
 */

const HEX = "0123456789abcdef";

function randomHex(chars: number): string {
  const bytes = new Uint8Array(Math.ceil(chars / 2));
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (const byte of bytes) out += HEX[byte >> 4] + HEX[byte & 15];
  return out.slice(0, chars);
}

/** Tokens are 48 chars: long, hex, and never derived from ids or timestamps. */
export const SHARE_TOKEN_LENGTH = 48;

export function generateShareToken(): string {
  return randomHex(SHARE_TOKEN_LENGTH);
}

/** True when a token has the expected shape (used to reject junk early). */
export function isShareTokenShaped(token: string): boolean {
  return (
    typeof token === "string" &&
    token.length === SHARE_TOKEN_LENGTH &&
    /^[0-9a-f]+$/.test(token)
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "template"
  );
}

export function generateUniqueShareToken(existing: Iterable<string>): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 8; attempt++) {
    const token = generateShareToken();
    if (!taken.has(token)) return token;
  }
  return generateShareToken();
}

/** A stable public slug like `regional-report-3f9a2b7c` with collision handling. */
export function generatePublicId(
  name: string,
  existing: Iterable<string>,
): string {
  const taken = new Set(existing);
  const base = slugify(name);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = `${base}-${randomHex(8)}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${randomHex(16)}`;
}
