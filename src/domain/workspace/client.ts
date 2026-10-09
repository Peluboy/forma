import { CLIENT_RECORD_VERSION } from "./types.js";

export type ClientStatus = "active" | "archived";

export interface ClientRecord {
  id: string;
  version: typeof CLIENT_RECORD_VERSION;

  workspaceId: string;

  name: string;
  description?: string;

  status: ClientStatus;

  brandIds: string[];
  templateFamilyRecordIds: string[];
  projectIds: string[];

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ClientRecordInput {
  id?: string;
  workspaceId: string;
  name: string;
  description?: string;
  status?: ClientStatus;
  brandIds?: string[];
  templateFamilyRecordIds?: string[];
  projectIds?: string[];
  notes?: string;
  now?: string;
}

export function createClientRecord(input: ClientRecordInput): ClientRecord {
  const name = input.name.trim();
  if (!name || name.length > 100) {
    throw new Error("Client name must be between 1 and 100 characters");
  }
  if (!input.workspaceId || typeof input.workspaceId !== "string") {
    throw new Error("Client must belong to a valid workspaceId");
  }
  const now = input.now || new Date().toISOString();
  return {
    id: input.id || `cli-${crypto.randomUUID()}`,
    version: CLIENT_RECORD_VERSION,
    workspaceId: input.workspaceId,
    name,
    description: input.description?.trim(),
    status: input.status || "active",
    brandIds: Array.isArray(input.brandIds) ? [...input.brandIds] : [],
    templateFamilyRecordIds: Array.isArray(input.templateFamilyRecordIds)
      ? [...input.templateFamilyRecordIds]
      : [],
    projectIds: Array.isArray(input.projectIds) ? [...input.projectIds] : [],
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };
}
