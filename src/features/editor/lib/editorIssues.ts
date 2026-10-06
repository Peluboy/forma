import {
  labels,
  type FieldId,
  type Project,
} from "../../../domain/design/model";
import type { IssueTarget } from "./editorNav";
import type { layerFits } from "../components/TextLayers";
import { inspectDocumentVisibility } from "../../../domain/design/documentVisibility";
import type { FlowDocument } from "../../../domain/design/flowDocument";
import { presentationIssues } from "../../../domain/design/presentation";

export function editorIssueIds(
  project: Project,
  documentTargets: IssueTarget[],
  missing: FieldId[],
  overflowing: FieldId[],
  extraOverflow: ReturnType<typeof layerFits>,
): string[] {
  if (project.family === "document")
    return documentTargets.map((issue) => issue.reason);
  if (project.family === "presentation") return presentationIssues(project);
  return [
    ...missing,
    ...overflowing,
    ...extraOverflow.map(({ layer }) => layer.id),
  ];
}

export function editorIssueState(
  project: Project,
  missing: FieldId[],
  overflowing: FieldId[],
  extraOverflow: ReturnType<typeof layerFits>,
): { issues: string[]; targets: IssueTarget[] } {
  const documentTargets = project.flow
    ? buildDocumentIssueTargets(project.flow)
    : [];
  return {
    issues: editorIssueIds(
      project,
      documentTargets,
      missing,
      overflowing,
      extraOverflow,
    ),
    targets:
      project.family === "document"
        ? documentTargets
        : buildIssueTargets(missing, overflowing, extraOverflow),
  };
}

export function buildDocumentIssueTargets(flow: FlowDocument): IssueTarget[] {
  return inspectDocumentVisibility(flow).map((issue) => ({
    kind: "document",
    id: issue.elementId,
    pageId: issue.pageId,
    label: `Page ${issue.pageNumber} · ${issue.elementId}`,
    reason: `${issue.reason} ${issue.suggestedAction}`,
  }));
}

export function buildIssueTargets(
  missing: FieldId[],
  overflowing: FieldId[],
  extraOverflow: ReturnType<typeof layerFits>,
): IssueTarget[] {
  return [
    ...missing.map((id): IssueTarget => ({
      kind: "field",
      id,
      label: labels[id],
      reason: `${labels[id]} is not mapped on the reference.`,
    })),
    ...overflowing.map((id): IssueTarget => ({
      kind: "field",
      id,
      label: labels[id],
      reason: `${labels[id]} needs more room.`,
    })),
    ...extraOverflow.map(({ layer }): IssueTarget => ({
      kind: "layer",
      id: layer.id,
      label: layer.text.slice(0, 40) || "Added text",
      reason: "This text needs more room.",
    })),
  ];
}
