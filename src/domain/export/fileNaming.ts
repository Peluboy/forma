const UNSAFE = /[<>:"/\\|?*\u0000-\u001f]/g;
const MULTI_UNDERSCORE = /_+/g;
const MAX_BASE = 80;

export function sanitizeFilePart(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(UNSAFE, "_")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "_")
    .replace(MULTI_UNDERSCORE, "_")
    .replace(/^_+|_+$/g, "");
}

export function exportDateStamp(now?: string): string {
  const date = now ? new Date(now) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function buildExportFilename(input: {
  clientName?: string;
  projectName?: string;
  kind?: string;
  now?: string;
  extension?: string;
}): string {
  const ext = (input.extension || "pdf").replace(/^\./, "");
  const client = sanitizeFilePart(input.clientName);
  const project = sanitizeFilePart(input.projectName) || "Export";
  const kind = sanitizeFilePart(input.kind || "");
  const date = exportDateStamp(input.now);
  const parts = [client, project, kind, date].filter(Boolean);
  let base = parts.join("_") || `Forma_Export_${date}`;
  if (base.length > MAX_BASE) {
    base = `${base.slice(0, MAX_BASE - 1).replace(/_+$/, "")}_`;
    base = base.slice(0, MAX_BASE);
  }
  return `${base}.${ext}`;
}
