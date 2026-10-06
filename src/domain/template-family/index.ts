export * from "./types.js";
export * from "./validation.js";
export * from "./resolver.js";
export * from "./builtin/editorialReport.js";

import { FORMA_EDITORIAL_REPORT } from "./builtin/editorialReport.js";
import type { TemplateFamily } from "./types.js";

const BUILTIN_FAMILIES = new Map<string, TemplateFamily>([
  [FORMA_EDITORIAL_REPORT.id, FORMA_EDITORIAL_REPORT],
]);

export function getTemplateFamily(id: string): TemplateFamily | undefined {
  return BUILTIN_FAMILIES.get(id);
}

export function listTemplateFamilies(): TemplateFamily[] {
  return Array.from(BUILTIN_FAMILIES.values());
}
