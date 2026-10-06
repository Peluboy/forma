import {
  applyContentBlocks,
  createProject,
  defaultLayouts,
  fieldIds,
  formatPresets,
  parseManuscriptBlocks,
  type FieldId,
  type FormatId,
  type Layout,
  type Project,
  type TemplateId,
} from "./model.js";
import { fontFamilies, type FontFamily } from "./fonts.js";

export type VersionRef = { id: string; version: number };
export type FontRole = FontFamily;

export type BrandSystem = {
  id: string;
  version: number;
  name: string;
  colors: {
    text: string;
    background: string;
    accent: string;
    [key: string]: string;
  };
  fonts: { display: FontRole; body: FontRole };
  palette: string[];
  spacingNote: string;
  updatedAt: string;
};

const HEX = /^#[0-9a-f]{6}$/i;

export function defaultBrandSystem(
  partial?: Partial<BrandSystem>,
): BrandSystem {
  return {
    id: partial?.id || "brand-default",
    version: partial?.version ?? 1,
    name: partial?.name ?? "",
    colors: {
      text: partial?.colors?.text || "#252920",
      background: partial?.colors?.background || "#f3eee5",
      accent: partial?.colors?.accent || "#e9783d",
      ...partial?.colors,
    },
    fonts: {
      display: partial?.fonts?.display || "Georgia",
      body: partial?.fonts?.body || "Arial",
    },
    palette: partial?.palette || [],
    spacingNote: partial?.spacingNote || "",
    updatedAt: partial?.updatedAt || new Date().toISOString(),
  };
}

/** Accept legacy {name,primary,secondary} and new BrandSystem shapes. */
export function normalizeBrand(value: unknown): BrandSystem {
  if (!value || typeof value !== "object") return defaultBrandSystem();
  const raw = value as Record<string, unknown>;
  if (raw.colors && typeof raw.colors === "object") {
    const colors = raw.colors as Record<string, unknown>;
    const fonts = (raw.fonts || {}) as Record<string, unknown>;
    return defaultBrandSystem({
      id: typeof raw.id === "string" ? raw.id : "brand-default",
      version:
        typeof raw.version === "number" && raw.version >= 1 ? raw.version : 1,
      name: typeof raw.name === "string" ? raw.name.slice(0, 100) : "",
      colors: {
        text:
          typeof colors.text === "string" && HEX.test(colors.text)
            ? colors.text
            : "#252920",
        background:
          typeof colors.background === "string" && HEX.test(colors.background)
            ? colors.background
            : "#f3eee5",
        accent:
          typeof colors.accent === "string" && HEX.test(colors.accent)
            ? colors.accent
            : "#e9783d",
      },
      fonts: {
        display:
          typeof fonts.display === "string" &&
          fontFamilies.includes(fonts.display as FontFamily)
            ? (fonts.display as FontFamily)
            : "Georgia",
        body:
          typeof fonts.body === "string" &&
          fontFamilies.includes(fonts.body as FontFamily)
            ? (fonts.body as FontFamily)
            : "Arial",
      },
      palette: Array.isArray(raw.palette)
        ? raw.palette
            .filter(
              (color): color is string =>
                typeof color === "string" && HEX.test(color),
            )
            .slice(0, 12)
        : [],
      spacingNote:
        typeof raw.spacingNote === "string"
          ? raw.spacingNote.slice(0, 500)
          : "",
      updatedAt:
        typeof raw.updatedAt === "string" &&
        Number.isFinite(Date.parse(raw.updatedAt))
          ? raw.updatedAt
          : new Date().toISOString(),
    });
  }
  return defaultBrandSystem({
    id: "brand-default",
    version: 1,
    name: typeof raw.name === "string" ? raw.name.slice(0, 100) : "",
    colors: {
      text:
        typeof raw.primary === "string" && HEX.test(raw.primary)
          ? raw.primary
          : "#252920",
      background:
        typeof raw.secondary === "string" && HEX.test(raw.secondary)
          ? raw.secondary
          : "#f3eee5",
      accent: "#e9783d",
    },
  });
}

export function isBrandSystem(value: unknown): value is BrandSystem {
  if (!value || typeof value !== "object") return false;
  const b = normalizeBrand(value);
  return (
    /^brand-[a-zA-Z0-9-]{1,80}$/.test(b.id) &&
    b.version >= 1 &&
    b.version <= 100000 &&
    b.name.length <= 100 &&
    HEX.test(b.colors.text) &&
    HEX.test(b.colors.background) &&
    HEX.test(b.colors.accent) &&
    fontFamilies.includes(b.fonts.display) &&
    fontFamilies.includes(b.fonts.body) &&
    b.palette.length <= 12 &&
    b.palette.every((color) => HEX.test(color)) &&
    b.spacingNote.length <= 500
  );
}

export function isVersionRef(value: unknown): value is VersionRef {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as VersionRef).id === "string" &&
    /^[a-zA-Z0-9-]{1,100}$/.test((value as VersionRef).id) &&
    typeof (value as VersionRef).version === "number" &&
    (value as VersionRef).version >= 1 &&
    (value as VersionRef).version <= 100000
  );
}

/** Apply brand tokens without changing manuscript wording. */
export function applyBrandToProject(
  project: Project,
  brand: BrandSystem,
): Partial<Project> {
  const layouts = Object.fromEntries(
    fieldIds.map((id) => [
      id,
      {
        ...project.layouts[id],
        color: brand.colors.text,
        fontFamily: id === "title" ? brand.fonts.display : brand.fonts.body,
      },
    ]),
  ) as Project["layouts"];
  return {
    backgroundColor: brand.colors.background,
    layouts,
    textLayers: project.textLayers?.map((layer) => ({
      ...layer,
      layout: {
        ...layer.layout,
        color: brand.colors.text,
        fontFamily: brand.fonts.body,
      },
    })),
    brandRef: { id: brand.id, version: brand.version },
  };
}

export function brandNeedsUpgrade(
  project: Project,
  latest: BrandSystem,
): boolean {
  return Boolean(
    project.brandRef &&
    project.brandRef.id === latest.id &&
    project.brandRef.version < latest.version,
  );
}

export type ComponentSlot = {
  id: string;
  fieldId?: FieldId;
  label: string;
  required: boolean;
};

export type DesignComponent = {
  id: string;
  name: string;
  version: number;
  slots: ComponentSlot[];
};

export const builtInComponents: DesignComponent[] = [
  {
    id: "comp-eyebrow-headline",
    name: "Eyebrow + headline",
    version: 1,
    slots: [
      { id: "kicker", fieldId: "kicker", label: "Eyebrow", required: false },
      { id: "title", fieldId: "title", label: "Headline", required: true },
    ],
  },
  {
    id: "comp-body",
    name: "Body copy",
    version: 1,
    slots: [
      {
        id: "description",
        fieldId: "description",
        label: "Body copy",
        required: false,
      },
    ],
  },
  {
    id: "comp-datetime-location",
    name: "Date & location",
    version: 1,
    slots: [
      { id: "date", fieldId: "date", label: "Date & time", required: false },
      {
        id: "location",
        fieldId: "location",
        label: "Location",
        required: false,
      },
    ],
  },
  {
    id: "comp-footer-cta",
    name: "Footer / CTA",
    version: 1,
    slots: [
      { id: "footer", fieldId: "footer", label: "Footer", required: false },
    ],
  },
];

export type VersionedTemplate = {
  id: string;
  version: number;
  name: string;
  themeId: TemplateId;
  format: Exclude<FormatId, "custom">;
  brandRef?: VersionRef;
  componentIds: string[];
  layouts: Record<FieldId, Layout>;
  backgroundColor?: string;
  updatedAt: string;
};

export function templateFromProject(
  project: Project,
  previous?: VersionedTemplate | null,
): VersionedTemplate {
  const format = project.format === "custom" ? "portrait" : project.format;
  return {
    id: previous?.id || `template-${project.id.slice(0, 8)}`,
    version: (previous?.version || 0) + 1,
    name: project.name.replace(/\s+template$/i, "").slice(0, 200) || "Template",
    themeId: project.template,
    format,
    brandRef: project.brandRef,
    componentIds: builtInComponents.map((c) => c.id),
    layouts: structuredClone(project.layouts),
    backgroundColor: project.backgroundColor,
    updatedAt: new Date().toISOString(),
  };
}

export function isVersionedTemplate(
  value: unknown,
): value is VersionedTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as VersionedTemplate;
  return (
    typeof t.id === "string" &&
    /^template-[a-zA-Z0-9-]{1,80}$/.test(t.id) &&
    typeof t.version === "number" &&
    t.version >= 1 &&
    typeof t.name === "string" &&
    t.name.length <= 200 &&
    typeof t.themeId === "string" &&
    ["portrait", "square", "story", "banner"].includes(t.format) &&
    Array.isArray(t.componentIds) &&
    t.componentIds.every((id) => typeof id === "string") &&
    !!t.layouts &&
    fieldIds.every((id) => t.layouts[id]) &&
    typeof t.updatedAt === "string"
  );
}

export function projectFromTemplate(
  template: VersionedTemplate,
  manuscript = "",
): Project {
  const base = createProject();
  const blocks = manuscript ? parseManuscriptBlocks(manuscript) : [];
  const applied = manuscript
    ? applyContentBlocks(base, blocks, manuscript)
    : {};
  return {
    ...base,
    ...applied,
    id: crypto.randomUUID(),
    name: template.name,
    template: template.themeId,
    format: template.format,
    pageSize: { ...formatPresets[template.format] },
    layouts: structuredClone(template.layouts),
    backgroundColor: template.backgroundColor,
    isTemplate: false,
    brandRef: template.brandRef,
    templateRef: { id: template.id, version: template.version },
    updatedAt: new Date().toISOString(),
  };
}

export type SkillManifest = {
  schemaVersion: 1;
  kind: "forma-skill";
  id: string;
  name: string;
  purpose: string;
  version: number;
  family: "graphics";
  status: "draft" | "published";
  requiredLabels: string[];
  brandRef?: VersionRef;
  templateRef?: VersionRef;
  themeId: TemplateId;
  format: Exclude<FormatId, "custom">;
  layoutPolicy: "exact-copy";
  minTypeSize: number;
  instructions: string;
  sampleManuscripts: string[];
  knownLimitations: string[];
  updatedAt: string;
};

export const EVENT_CAMPAIGN_SKILL: SkillManifest = {
  schemaVersion: 1,
  kind: "forma-skill",
  id: "skill-event-campaign",
  name: "Event campaign",
  purpose:
    "Apply a branded event flyer layout to an approved manuscript while preserving exact wording.",
  version: 1,
  family: "graphics",
  status: "published",
  requiredLabels: ["Headline"],
  themeId: "gathering",
  format: "portrait",
  layoutPolicy: "exact-copy",
  minTypeSize: 11,
  instructions:
    "Map recognized manuscript labels to the event flyer fields. Extra labeled sections become text layers. Never rewrite copy. Fail visual export when any nonempty block is unmapped or overflows.",
  sampleManuscripts: [
    `Eyebrow: SPRING SALON\n\nHeadline: Ideas in the room.\n\nBody copy: An evening for makers and hosts.\n\nDate & time: MAY 12, 2026\n6:00 PM\n\nLocation: THE LOFT\n\nFooter: RSVP REQUIRED`,
    `Eyebrow: CITY SERIES\n\nHeadline: Open doors downtown.\n\nBody copy: Bring your notebook. Leave with a plan.\n\nDate & time: JUNE 3, 2026\n7:00 PM\n\nLocation: RIVER HALL\n\nFooter: FREE WITH REGISTRATION`,
  ],
  knownLimitations: [
    "Single-page graphics only",
    "Does not invent copy or event details",
    "Custom page sizes require a separate resize after apply",
  ],
  updatedAt: "2026-10-01T00:00:00.000Z",
};

export function isSkillManifest(value: unknown): value is SkillManifest {
  if (!value || typeof value !== "object") return false;
  const s = value as SkillManifest;
  return (
    s.schemaVersion === 1 &&
    s.kind === "forma-skill" &&
    typeof s.id === "string" &&
    /^skill-[a-zA-Z0-9-]{1,80}$/.test(s.id) &&
    typeof s.name === "string" &&
    s.name.length <= 120 &&
    typeof s.purpose === "string" &&
    s.purpose.length <= 500 &&
    typeof s.version === "number" &&
    s.version >= 1 &&
    s.family === "graphics" &&
    (s.status === "draft" || s.status === "published") &&
    Array.isArray(s.requiredLabels) &&
    s.requiredLabels.every((l) => typeof l === "string" && l.length <= 80) &&
    s.layoutPolicy === "exact-copy" &&
    typeof s.minTypeSize === "number" &&
    s.minTypeSize >= 11 &&
    typeof s.instructions === "string" &&
    s.instructions.length <= 8000 &&
    Array.isArray(s.sampleManuscripts) &&
    s.sampleManuscripts.every(
      (m) => typeof m === "string" && m.length <= 30000,
    ) &&
    Array.isArray(s.knownLimitations) &&
    typeof s.updatedAt === "string"
  );
}

export type SkillApplyResult = {
  project: Project;
  mapped: { id: string; label: string }[];
  unmapped: { id: string; label: string; text: string }[];
  missingRequired: string[];
};

export function applySkill(
  skill: SkillManifest,
  manuscript: string,
  options?: {
    brand?: BrandSystem;
    template?: VersionedTemplate;
    base?: Project;
  },
): SkillApplyResult {
  if (skill.layoutPolicy !== "exact-copy")
    throw new Error("Only exact-copy skills are supported.");
  const template = options?.template;
  let project = template
    ? projectFromTemplate(template, manuscript)
    : {
        ...createProject(),
        id: crypto.randomUUID(),
        template: skill.themeId,
        format: skill.format,
        pageSize: { ...formatPresets[skill.format] },
        layouts: defaultLayouts(),
      };
  if (options?.base) {
    project = {
      ...project,
      id: options.base.id,
      name: options.base.name,
    };
  }
  const blocks = parseManuscriptBlocks(manuscript);
  const patch = applyContentBlocks(project, blocks, manuscript);
  project = {
    ...project,
    ...patch,
    skillRef: { id: skill.id, version: skill.version },
    templateRef: template
      ? { id: template.id, version: template.version }
      : project.templateRef,
    updatedAt: new Date().toISOString(),
  };
  if (options?.brand) {
    project = { ...project, ...applyBrandToProject(project, options.brand) };
  } else if (skill.brandRef) {
    project = {
      ...project,
      brandRef: skill.brandRef,
    };
  }

  const mapped = blocks
    .filter((b) => b.fieldId || b.text.trim())
    .map((b) => ({ id: b.id, label: b.label }));
  // All nonempty blocks are applied to fields or managed layers — none left unmapped after apply.
  const unmapped: SkillApplyResult["unmapped"] = [];
  const presentLabels = new Set(blocks.map((b) => b.label.toLowerCase()));
  const missingRequired = skill.requiredLabels.filter(
    (label) => !presentLabels.has(label.toLowerCase()),
  );

  return { project, mapped, unmapped, missingRequired };
}

export function skillNeedsUpgrade(
  project: Project,
  latest: SkillManifest,
): boolean {
  return Boolean(
    project.skillRef &&
    project.skillRef.id === latest.id &&
    project.skillRef.version < latest.version,
  );
}

export type SkillPackage = {
  manifest: SkillManifest;
  instructions: string;
};

export function exportSkillPackage(skill: SkillManifest): SkillPackage {
  return {
    manifest: structuredClone(skill),
    instructions: skill.instructions,
  };
}

export function importSkillPackage(value: unknown): SkillManifest {
  if (!value || typeof value !== "object")
    throw new Error("Choose a valid Forma skill package.");
  const record = value as Record<string, unknown>;
  const manifest = (record.manifest || record) as unknown;
  if (!isSkillManifest(manifest))
    throw new Error("This skill package is invalid or unsupported.");
  if (manifest.layoutPolicy !== "exact-copy")
    throw new Error("Imported skills cannot override exact-copy restrictions.");
  // Reject executable payloads — only declarative fields are kept.
  const clean = structuredClone(manifest);
  delete (clean as { code?: unknown }).code;
  delete (clean as { tools?: unknown }).tools;
  return clean;
}

const GUEST_BRAND_KEY = "forma.brand.v2";
const GUEST_TEMPLATES_KEY = "forma.templates.v1";
const GUEST_SKILLS_KEY = "forma.skills.v1";

export function readGuestBrand(): BrandSystem {
  try {
    return normalizeBrand(
      JSON.parse(localStorage.getItem(GUEST_BRAND_KEY) || "null"),
    );
  } catch {
    return defaultBrandSystem();
  }
}

export function writeGuestBrand(brand: BrandSystem) {
  localStorage.setItem(GUEST_BRAND_KEY, JSON.stringify(brand));
}

export function readGuestTemplates(): VersionedTemplate[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_TEMPLATES_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(isVersionedTemplate) : [];
  } catch {
    return [];
  }
}

export function writeGuestTemplates(templates: VersionedTemplate[]) {
  localStorage.setItem(
    GUEST_TEMPLATES_KEY,
    JSON.stringify(templates.slice(0, 40)),
  );
}

export function readGuestSkills(): SkillManifest[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_SKILLS_KEY) || "[]");
    const list = Array.isArray(raw) ? raw.filter(isSkillManifest) : [];
    if (!list.some((s) => s.id === EVENT_CAMPAIGN_SKILL.id))
      return [EVENT_CAMPAIGN_SKILL, ...list];
    return list;
  } catch {
    return [EVENT_CAMPAIGN_SKILL];
  }
}

export function writeGuestSkills(skills: SkillManifest[]) {
  localStorage.setItem(GUEST_SKILLS_KEY, JSON.stringify(skills.slice(0, 40)));
}
