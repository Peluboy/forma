import type { TemplateFamily } from "../template-family/types.js";
import { initialApprovalState } from "./approval.js";
import { buildTemplateQualitySummary } from "./qualitySummary.js";
import { validateTemplateFamilyV2 } from "./validationV2.js";
import {
  TEMPLATE_FAMILY_RECORD_VERSION,
  type TemplateFamilyRecord,
  type TemplateRecordInput,
  type TemplateRecordSource,
  type TemplateRecordStatus,
  type TemplateSmokeReport,
  type TemplateCapacityReport,
  type TemplateValidationV2Result,
} from "./types.js";
import { emptyUsageMetadata } from "./usage.js";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `tpl-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "template"
  );
}

export function defaultStatusForSource(
  source: TemplateRecordSource,
): TemplateRecordStatus {
  if (source === "builtin") return "approved";
  if (source === "manual" || source === "forked") return "draft";
  return "candidate";
}

export function createTemplateFamilyRecord(
  input: TemplateRecordInput,
): TemplateFamilyRecord {
  const validation = validateTemplateFamilyV2(input.family);
  const status = input.status ?? defaultStatusForSource(input.source);
  const isBuiltin = input.source === "builtin";
  const layoutIds = input.family.layouts.map((layout) => layout.id);
  const approval = initialApprovalState(layoutIds, {
    approved: isBuiltin && status === "approved",
    approvedBy: isBuiltin ? "forma" : undefined,
  });
  if (isBuiltin && status === "approved")
    for (const id of layoutIds)
      approval.reviewedLayouts[id] = {
        status: "approved",
        lastReviewedAt: nowIso(),
      };

  const quality = buildTemplateQualitySummary({
    family: input.family,
    validation,
    approval,
  });

  const templateId = `tpl-${slugify(input.name || input.family.name)}-${newId().slice(0, 8)}`;
  const timestamp = nowIso();

  return {
    id: templateId,
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    version: TEMPLATE_FAMILY_RECORD_VERSION,
    name: input.name || input.family.name,
    ...(input.description || input.family.description
      ? { description: input.description || input.family.description }
      : {}),
    status,
    source: input.source,
    family: input.family,
    approval,
    quality,
    usage: emptyUsageMetadata(),
    ...(input.reference ? { reference: input.reference } : {}),
    ...(input.sharing ? { sharing: input.sharing } : {}),
    ...(input.forkedFrom ? { forkedFrom: input.forkedFrom } : {}),
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    templateId,
    versionNumber: 1,
    changelog: "Initial version.",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface FinalizeInput {
  validation?: TemplateValidationV2Result;
  smoke?: TemplateSmokeReport | null;
  capacity?: TemplateCapacityReport | null;
}

/** Recomputes the quality summary from the latest validation/smoke/capacity. */
export function finalizeTemplateRecord(
  record: TemplateFamilyRecord,
  input: FinalizeInput,
): TemplateFamilyRecord {
  const validation =
    input.validation ?? validateTemplateFamilyV2(record.family);
  const quality = buildTemplateQualitySummary({
    family: record.family,
    validation,
    approval: record.approval,
    smoke: input.smoke ?? null,
    capacity: input.capacity ?? null,
  });
  return { ...record, quality, updatedAt: nowIso() };
}

export interface TemplateRecordPatch {
  name?: string;
  description?: string;
  status?: TemplateRecordStatus;
  family?: TemplateFamily;
  approval?: TemplateFamilyRecord["approval"];
  usage?: TemplateFamilyRecord["usage"];
  reference?: TemplateFamilyRecord["reference"];
  sharing?: TemplateFamilyRecord["sharing"];
  changelog?: string;
  finalize?: FinalizeInput;
}

export function updateTemplateFamilyRecord(
  record: TemplateFamilyRecord,
  patch: TemplateRecordPatch,
): TemplateFamilyRecord {
  const next: TemplateFamilyRecord = {
    ...record,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.family !== undefined ? { family: patch.family } : {}),
    ...(patch.approval !== undefined ? { approval: patch.approval } : {}),
    ...(patch.usage !== undefined ? { usage: patch.usage } : {}),
    ...(patch.reference !== undefined ? { reference: patch.reference } : {}),
    ...(patch.sharing !== undefined ? { sharing: patch.sharing } : {}),
    ...(patch.changelog !== undefined ? { changelog: patch.changelog } : {}),
    updatedAt: nowIso(),
  };
  return patch.finalize ? finalizeTemplateRecord(next, patch.finalize) : next;
}

export function archiveTemplateFamilyRecord(
  record: TemplateFamilyRecord,
): TemplateFamilyRecord {
  return updateTemplateFamilyRecord(record, {
    status: "archived",
    changelog: "Archived.",
  });
}

export function rejectTemplateFamilyRecord(
  record: TemplateFamilyRecord,
  reason?: string,
): TemplateFamilyRecord {
  return updateTemplateFamilyRecord(record, {
    status: "rejected",
    ...(reason ? { changelog: `Rejected: ${reason}` } : {}),
  });
}

/** Duplicates a record into a fresh lineage root (draft). */
export function duplicateTemplateFamilyRecord(
  record: TemplateFamilyRecord,
  options: { name?: string; ownerId?: string } = {},
): TemplateFamilyRecord {
  return createTemplateFamilyRecord({
    family: record.family,
    source: record.source === "builtin" ? "manual" : record.source,
    name: options.name || `${record.name} copy`,
    description: record.description,
    status: "draft",
    ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    ...(record.reference ? { reference: record.reference } : {}),
  });
}

export function isTemplateFamilyRecord(
  value: unknown,
): value is TemplateFamilyRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<TemplateFamilyRecord>;
  return (
    typeof r.id === "string" &&
    r.version === TEMPLATE_FAMILY_RECORD_VERSION &&
    typeof r.name === "string" &&
    typeof r.templateId === "string" &&
    typeof r.versionNumber === "number" &&
    r.versionNumber >= 1 &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string" &&
    !!r.family &&
    Array.isArray((r.family as TemplateFamily).layouts) &&
    !!r.approval &&
    !!r.quality
  );
}

// ─── Persistence (Part I) ────────────────────────────────────────────────────

export interface TemplateFamilyRecordStore {
  list(): TemplateFamilyRecord[];
  get(id: string): TemplateFamilyRecord | undefined;
  save(record: TemplateFamilyRecord): TemplateFamilyRecord;
  remove(id: string): void;
  /** All versions of a lineage, oldest first. */
  listVersions(templateId: string): TemplateFamilyRecord[];
}

export class MemoryTemplateRecordStore implements TemplateFamilyRecordStore {
  private records = new Map<string, TemplateFamilyRecord>();

  constructor(initial: TemplateFamilyRecord[] = []) {
    for (const record of initial)
      if (isTemplateFamilyRecord(record)) this.records.set(record.id, record);
  }

  list(): TemplateFamilyRecord[] {
    return Array.from(this.records.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  get(id: string): TemplateFamilyRecord | undefined {
    return this.records.get(id);
  }

  save(record: TemplateFamilyRecord): TemplateFamilyRecord {
    if (!isTemplateFamilyRecord(record))
      throw new Error("Cannot persist an invalid TemplateFamilyRecord.");
    this.records.set(record.id, record);
    return record;
  }

  remove(id: string): void {
    this.records.delete(id);
  }

  listVersions(templateId: string): TemplateFamilyRecord[] {
    return this.list()
      .filter((record) => record.templateId === templateId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }
}

const LOCAL_STORAGE_KEY = "forma.templateFamilies.v1";

export class LocalStorageTemplateRecordStore implements TemplateFamilyRecordStore {
  private read(): TemplateFamilyRecord[] {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(isTemplateFamilyRecord) : [];
    } catch {
      return [];
    }
  }

  private write(records: TemplateFamilyRecord[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  }

  list(): TemplateFamilyRecord[] {
    return this.read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): TemplateFamilyRecord | undefined {
    return this.read().find((record) => record.id === id);
  }

  save(record: TemplateFamilyRecord): TemplateFamilyRecord {
    if (!isTemplateFamilyRecord(record))
      throw new Error("Cannot persist an invalid TemplateFamilyRecord.");
    const records = this.read().filter((item) => item.id !== record.id);
    records.push(record);
    this.write(records);
    return record;
  }

  remove(id: string): void {
    this.write(this.read().filter((record) => record.id !== id));
  }

  listVersions(templateId: string): TemplateFamilyRecord[] {
    return this.read()
      .filter((record) => record.templateId === templateId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }
}
