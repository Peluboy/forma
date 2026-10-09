import { createClientRecord, type ClientRecord } from "./client.js";
import {
  WORKSPACE_RECORD_VERSION,
  type WorkspaceActor,
  type WorkspaceRecord,
  type WorkspaceSettings,
  type WorkspaceType,
} from "./types.js";
import { isClientRecord, isWorkspaceRecord } from "./validation.js";

export const LOCAL_STORAGE_WORKSPACES_KEY = "forma.workspaces.v1";
export const LOCAL_STORAGE_CLIENTS_KEY = "forma.clients.v1";

export function createPersonalWorkspace(
  ownerOrId: WorkspaceActor | string,
  nameOrNow?: string,
  now?: string,
): WorkspaceRecord {
  const actor: WorkspaceActor =
    typeof ownerOrId === "string"
      ? { userId: ownerOrId, name: nameOrNow }
      : ownerOrId;
  const timestamp =
    (typeof ownerOrId === "string" ? now : nameOrNow) ||
    new Date().toISOString();
  return {
    id: `ws-personal-${actor.userId}`,
    version: WORKSPACE_RECORD_VERSION,
    name: actor.name ? `${actor.name}'s Workspace` : "Personal Workspace",
    description: "Default personal workspace",
    ownerId: actor.userId,
    type: "personal",
    members: [
      {
        userId: actor.userId,
        email: actor.email,
        name: actor.name,
        role: "owner",
        status: "active",
        joinedAt: timestamp,
      },
    ],
    settings: {
      defaultProjectVisibility: "private",
      allowTemplateSharing: true,
      allowPublicTemplatePublishing: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createAgencyWorkspace(
  inputOrName:
    | string
    | {
        id?: string;
        name: string;
        description?: string;
        type?: WorkspaceType;
        owner: WorkspaceActor;
        settings?: WorkspaceSettings;
        now?: string;
      },
  ownerOrId?: WorkspaceActor | string,
  ownerName?: string,
  now?: string,
): WorkspaceRecord {
  let name = "";
  let description: string | undefined;
  let type: WorkspaceType = "agency";
  let owner: WorkspaceActor;
  let settings: WorkspaceSettings | undefined;
  let timestamp = "";
  let customId: string | undefined;

  if (typeof inputOrName === "string") {
    name = inputOrName.trim();
    if (typeof ownerOrId === "string") {
      owner = { userId: ownerOrId, name: ownerName };
    } else if (ownerOrId) {
      owner = ownerOrId;
    } else {
      throw new Error("Agency workspace requires an owner");
    }
    timestamp = now || new Date().toISOString();
  } else {
    name = inputOrName.name.trim();
    description = inputOrName.description?.trim();
    type = inputOrName.type || "agency";
    owner = inputOrName.owner;
    settings = inputOrName.settings;
    timestamp = inputOrName.now || new Date().toISOString();
    customId = inputOrName.id;
  }

  if (!name || name.length > 100) {
    throw new Error("Workspace name must be between 1 and 100 characters");
  }
  return {
    id: customId || `ws-${crypto.randomUUID()}`,
    version: WORKSPACE_RECORD_VERSION,
    name,
    description,
    ownerId: owner.userId,
    type,
    members: [
      {
        userId: owner.userId,
        email: owner.email,
        name: owner.name,
        role: "owner",
        status: "active",
        joinedAt: timestamp,
      },
    ],
    settings: {
      defaultProjectVisibility:
        settings?.defaultProjectVisibility || "workspace",
      allowTemplateSharing: settings?.allowTemplateSharing ?? true,
      allowPublicTemplatePublishing:
        settings?.allowPublicTemplatePublishing ?? false,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ─── Workspace Stores ────────────────────────────────────────────────────────

export interface WorkspaceRecordStore {
  list(actor?: WorkspaceActor): WorkspaceRecord[];
  get(id: string): WorkspaceRecord | null;
  save(record: WorkspaceRecord): WorkspaceRecord;
  remove(id: string): void;
}

export class MemoryWorkspaceStore implements WorkspaceRecordStore {
  private records = new Map<string, WorkspaceRecord>();

  list(actor?: WorkspaceActor): WorkspaceRecord[] {
    const all = Array.from(this.records.values());
    if (!actor || !actor.userId) return all;
    return all.filter((w) =>
      w.members.some((m) => m.userId === actor.userId && m.status === "active"),
    );
  }

  get(id: string): WorkspaceRecord | null {
    const found = this.records.get(id);
    return found ? structuredClone(found) : null;
  }

  save(record: WorkspaceRecord): WorkspaceRecord {
    if (!isWorkspaceRecord(record)) {
      throw new Error("Invalid workspace record");
    }
    const cloned = structuredClone(record);
    cloned.updatedAt = new Date().toISOString();
    this.records.set(cloned.id, cloned);
    return structuredClone(cloned);
  }

  remove(id: string): void {
    this.records.delete(id);
  }
}

export class LocalStorageWorkspaceStore implements WorkspaceRecordStore {
  constructor(private storageKey: string = LOCAL_STORAGE_WORKSPACES_KEY) {}

  private readRaw(): WorkspaceRecord[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const item = localStorage.getItem(this.storageKey);
      if (!item) return [];
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed.filter(isWorkspaceRecord) : [];
    } catch {
      return [];
    }
  }

  private writeRaw(records: WorkspaceRecord[]): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch {
      /* private browsing or quota */
    }
  }

  list(actor?: WorkspaceActor): WorkspaceRecord[] {
    const all = this.readRaw();
    if (!actor || !actor.userId) return all;
    return all.filter((w) =>
      w.members.some((m) => m.userId === actor.userId && m.status === "active"),
    );
  }

  get(id: string): WorkspaceRecord | null {
    const match = this.readRaw().find((w) => w.id === id);
    return match ? structuredClone(match) : null;
  }

  save(record: WorkspaceRecord): WorkspaceRecord {
    if (!isWorkspaceRecord(record)) {
      throw new Error("Invalid workspace record");
    }
    const all = this.readRaw().filter((w) => w.id !== record.id);
    const cloned = structuredClone(record);
    cloned.updatedAt = new Date().toISOString();
    all.unshift(cloned);
    this.writeRaw(all);
    return structuredClone(cloned);
  }

  remove(id: string): void {
    const all = this.readRaw().filter((w) => w.id !== id);
    this.writeRaw(all);
  }
}

// ─── Client Stores ───────────────────────────────────────────────────────────

export interface ClientRecordStore {
  list(workspaceId?: string): ClientRecord[];
  listForWorkspace(workspaceId: string): ClientRecord[];
  get(id: string): ClientRecord | null;
  save(record: ClientRecord): ClientRecord;
  archive(id: string): ClientRecord | null;
  remove(id: string): void;
}

export class MemoryClientStore implements ClientRecordStore {
  private records = new Map<string, ClientRecord>();

  list(workspaceId?: string): ClientRecord[] {
    const all = Array.from(this.records.values());
    if (!workspaceId) return all.map((c) => structuredClone(c));
    return all
      .filter((c) => c.workspaceId === workspaceId)
      .map((c) => structuredClone(c));
  }

  listForWorkspace(workspaceId: string): ClientRecord[] {
    return this.list(workspaceId);
  }

  get(id: string): ClientRecord | null {
    const found = this.records.get(id);
    return found ? structuredClone(found) : null;
  }

  save(record: ClientRecord): ClientRecord {
    if (!isClientRecord(record)) {
      throw new Error("Invalid client record");
    }
    const cloned = structuredClone(record);
    cloned.updatedAt = new Date().toISOString();
    this.records.set(cloned.id, cloned);
    return structuredClone(cloned);
  }

  archive(id: string): ClientRecord | null {
    const existing = this.get(id);
    if (!existing) return null;
    existing.status = "archived";
    return this.save(existing);
  }

  remove(id: string): void {
    this.records.delete(id);
  }
}

export class LocalStorageClientStore implements ClientRecordStore {
  constructor(private storageKey: string = LOCAL_STORAGE_CLIENTS_KEY) {}

  private readRaw(): ClientRecord[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const item = localStorage.getItem(this.storageKey);
      if (!item) return [];
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed.filter(isClientRecord) : [];
    } catch {
      return [];
    }
  }

  private writeRaw(records: ClientRecord[]): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch {
      /* private browsing */
    }
  }

  list(workspaceId?: string): ClientRecord[] {
    const all = this.readRaw();
    if (!workspaceId) return all.map((c) => structuredClone(c));
    return all
      .filter((c) => c.workspaceId === workspaceId)
      .map((c) => structuredClone(c));
  }

  listForWorkspace(workspaceId: string): ClientRecord[] {
    return this.list(workspaceId);
  }

  get(id: string): ClientRecord | null {
    const match = this.readRaw().find((c) => c.id === id);
    return match ? structuredClone(match) : null;
  }

  save(record: ClientRecord): ClientRecord {
    if (!isClientRecord(record)) {
      throw new Error("Invalid client record");
    }
    const all = this.readRaw().filter((c) => c.id !== record.id);
    const cloned = structuredClone(record);
    cloned.updatedAt = new Date().toISOString();
    all.unshift(cloned);
    this.writeRaw(all);
    return structuredClone(cloned);
  }

  archive(id: string): ClientRecord | null {
    const existing = this.get(id);
    if (!existing) return null;
    existing.status = "archived";
    return this.save(existing);
  }

  remove(id: string): void {
    const all = this.readRaw().filter((c) => c.id !== id);
    this.writeRaw(all);
  }
}

export { createClientRecord };
