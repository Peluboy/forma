import type { FieldId } from "../../../domain/design/model";
import { fieldIds } from "../../../domain/design/model";

/** Internal rail nav ids used by App. */
export type EditorNav =
  | "templates"
  | "reference"
  | "text"
  | "elements"
  | "projects"
  | "skills"
  | "document"
  | "presentation"
  | "team";

/** Public deep-link tool names (URL ?tool=). */
export type EditorTool =
  | "design"
  | "text"
  | "elements"
  | "reference"
  | "document"
  | "slides"
  | "workflows"
  | "team"
  | "projects"
  | "help"
  | "content"
  | "issues";

export type EditorPanel = "content" | "issues";

const TOOL_ALIASES: Record<string, EditorTool> = {
  design: "design",
  templates: "design",
  text: "text",
  elements: "elements",
  reference: "reference",
  upload: "reference",
  document: "document",
  slides: "slides",
  presentation: "slides",
  workflow: "workflows",
  workflows: "workflows",
  skills: "workflows",
  team: "team",
  project: "projects",
  projects: "projects",
  help: "help",
  content: "content",
  manuscript: "content",
  issues: "issues",
  checks: "issues",
};

const TOOL_TO_NAV: Partial<Record<EditorTool, EditorNav>> = {
  design: "templates",
  text: "text",
  elements: "elements",
  reference: "reference",
  document: "document",
  slides: "presentation",
  workflows: "skills",
  team: "team",
  projects: "projects",
};

const NAV_TO_TOOL: Record<EditorNav, string> = {
  templates: "design",
  text: "text",
  elements: "elements",
  reference: "reference",
  document: "document",
  presentation: "slides",
  skills: "workflows",
  team: "team",
  projects: "projects",
};

export type EditorLink = {
  tool?: string | null;
  panel?: string | null;
  select?: string | null;
  dialog?: string | null;
};

export function parseEditorTool(raw: string | null): EditorTool | undefined {
  if (!raw) return undefined;
  return TOOL_ALIASES[raw.trim().toLowerCase()];
}

export function navFromTool(tool: EditorTool): EditorNav | null {
  return TOOL_TO_NAV[tool] ?? null;
}

export function toolFromNav(nav: EditorNav): string {
  return NAV_TO_TOOL[nav];
}

export function readEditorLink(search = location.search): {
  tool?: EditorTool;
  panel?: EditorPanel;
  select?: string;
  dialog?: string;
} {
  const params = new URLSearchParams(search);
  const tool = parseEditorTool(params.get("tool"));
  const panelRaw = params.get("panel");
  let panel: EditorPanel | undefined;
  if (panelRaw === "content" || panelRaw === "manuscript" || tool === "content")
    panel = "content";
  else if (panelRaw === "issues" || panelRaw === "checks" || tool === "issues")
    panel = "issues";
  return {
    tool,
    panel,
    select: params.get("select") || undefined,
    dialog: params.get("dialog") || undefined,
  };
}

/** null clears a key; undefined leaves it unchanged. */
export function writeEditorLink(patch: EditorLink) {
  const params = new URLSearchParams(location.search);
  for (const key of ["tool", "panel", "select", "dialog"] as const) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === null || value === "") params.delete(key);
    else if (value != null) params.set(key, value);
  }
  const next = `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`;
  history.replaceState({}, "", next);
}

/** Keep reload and share links attached to the project currently in the editor. */
export function projectEditorUrl(
  id: string,
  search: string,
  pathname: string,
  hash = "",
) {
  const params = new URLSearchParams(search);
  params.set("project", id);
  params.delete("select");
  return `${pathname}?${params}${hash}`;
}

export function writeEditorProjectLink(id: string) {
  history.replaceState(
    {},
    "",
    projectEditorUrl(id, location.search, location.pathname, location.hash),
  );
}

export function isFieldSelect(id: string): id is FieldId {
  return (fieldIds as readonly string[]).includes(id);
}

export type IssueTarget =
  | { kind: "field"; id: FieldId; label: string; reason: string }
  | { kind: "layer"; id: string; label: string; reason: string }
  | {
      kind: "document";
      id: string;
      pageId: string;
      label: string;
      reason: string;
    };

export { TOOL_TO_NAV, NAV_TO_TOOL };
