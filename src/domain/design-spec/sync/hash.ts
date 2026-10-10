export function stableHash(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function textPreview(value: string, limit = 80): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}…`;
}
