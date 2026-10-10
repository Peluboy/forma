/**
 * Pure helpers for workspace/client context labels and small UI copy.
 * No React, no DOM: covered by tests/ui-helpers.test.ts.
 */

export interface ScopeContext {
  workspaceName?: string;
  clientName?: string;
  section?: string;
}

export type ScopeKind = "personal" | "workspace" | "client";

export function scopeKind(ctx: ScopeContext): ScopeKind {
  if (ctx.workspaceName && ctx.clientName) return "client";
  if (ctx.workspaceName) return "workspace";
  return "personal";
}

/** "Acme Studio / Bloom Health / Templates" style trail. */
export function scopeTrail(ctx: ScopeContext): string[] {
  const trail = ctx.workspaceName
    ? [ctx.workspaceName, ...(ctx.clientName ? [ctx.clientName] : [])]
    : ["Personal"];
  return ctx.section ? [...trail, ctx.section] : trail;
}

export function saveDestinationLabel(ctx: ScopeContext): string {
  switch (scopeKind(ctx)) {
    case "client":
      return `Saved to ${ctx.clientName} in ${ctx.workspaceName}`;
    case "workspace":
      return `Saved to ${ctx.workspaceName}`;
    default:
      return "Saved to your personal space";
  }
}

export function scopeKindLabel(kind: ScopeKind): string {
  return { personal: "Personal", workspace: "Workspace", client: "Client" }[
    kind
  ];
}

export function monogram(name: string | undefined): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "F";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stable hue per name, used for monogram tiles and placeholder art. */
export function nameHue(name: string | undefined): number {
  let hash = 0;
  for (const char of name || "forma")
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function greeting(date: Date, name?: string): string {
  const hour = date.getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

export function pluralize(count: number, word: string, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`;
}

export function relativeDate(
  iso: string | undefined,
  now = new Date(),
): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function templateMetaLine(input: {
  layoutCount?: number;
  category?: string;
}): string {
  const parts = [
    input.layoutCount ? pluralize(input.layoutCount, "layout") : "",
    input.category || "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export type WorkspaceRoleId = "owner" | "admin" | "designer" | "viewer";

export function canEditInWorkspace(role: string | undefined): boolean {
  return role === "owner" || role === "admin" || role === "designer";
}

export function canManageWorkspace(role: string | undefined): boolean {
  return role === "owner" || role === "admin";
}

export type AccessCopyKind = "view_only" | "no_workspace_access" | "ask_admin";

export function accessCopy(kind: AccessCopyKind): string {
  switch (kind) {
    case "view_only":
      return "You can view this, but you cannot edit it.";
    case "no_workspace_access":
      return "You do not have access to this workspace.";
    default:
      return "Ask an owner or admin for access.";
  }
}

export type CreateStep = 0 | 1 | 2;

/** Create flow progress: 0 Words, 1 Style, 2 Review. */
export function createStepIndex(input: {
  hasContent: boolean;
  generating: boolean;
  hasResults: boolean;
}): CreateStep {
  if (input.hasResults || input.generating) return 2;
  if (input.hasContent) return 1;
  return 0;
}
