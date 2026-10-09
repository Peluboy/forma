export type WorkspaceActivityAction =
  | "workspace.created"
  | "client.created"
  | "client.archived"
  | "template.assigned"
  | "template.approved"
  | "project.generated"
  | "template.fork.imported"
  | "member.invited"
  | "member.removed";

export interface WorkspaceActivityActor {
  userId: string;
  email?: string;
  name?: string;
}

export interface WorkspaceActivityEvent {
  id: string;
  workspaceId: string;
  clientId?: string;
  at: string;
  actor: WorkspaceActivityActor;
  action: WorkspaceActivityAction;
  target?: string;
  detail?: Record<string, unknown>;
}

export function createWorkspaceActivity(input: {
  id?: string;
  workspaceId: string;
  clientId?: string;
  actor: WorkspaceActivityActor;
  action: WorkspaceActivityAction;
  target?: string;
  detail?: Record<string, unknown>;
  now?: string;
}): WorkspaceActivityEvent {
  return {
    id: input.id || `act-${crypto.randomUUID()}`,
    workspaceId: input.workspaceId,
    clientId: input.clientId,
    at: input.now || new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    detail: input.detail,
  };
}
