import type { TemplateFamilyRecord, TemplateVersionSummary } from "./types.js";

/**
 * Lightweight versioning (Part J).
 *
 * A new version is created whenever an approved (or otherwise changed) template
 * is saved. The lineage root id (`templateId`) never changes, the previous
 * version stays accessible, and a changelog is recorded. This is not git-style
 * diffing — just a safe history so old generated projects keep their context.
 */

export function createTemplateVersion(
  previous: TemplateFamilyRecord,
  patch: {
    family?: TemplateFamilyRecord["family"];
    name?: string;
    description?: string;
    changelog: string;
  },
): TemplateFamilyRecord {
  const versionNumber = previous.versionNumber + 1;
  const timestamp = new Date().toISOString();
  return {
    ...previous,
    id: `${previous.templateId}@v${versionNumber}`,
    name: patch.name ?? previous.name,
    description: patch.description ?? previous.description,
    family: patch.family ?? previous.family,
    versionNumber,
    parentVersionId: previous.id,
    changelog: patch.changelog,
    createdAt: timestamp,
    updatedAt: timestamp,
    // A new version starts from the previous approval state so reviewers do not
    // re-approve unchanged layouts; changed layouts are re-reviewed by the UI.
    approval: {
      ...previous.approval,
      approved: false,
      approvedAt: undefined,
      approvedBy: undefined,
    },
  };
}

export function listTemplateVersions(
  records: TemplateFamilyRecord[],
  templateId: string,
): TemplateVersionSummary[] {
  return records
    .filter((record) => record.templateId === templateId)
    .sort((a, b) => a.versionNumber - b.versionNumber)
    .map((record) => ({
      templateId: record.templateId,
      versionNumber: record.versionNumber,
      recordId: record.id,
      ...(record.parentVersionId
        ? { parentVersionId: record.parentVersionId }
        : {}),
      changelog: record.changelog ?? "",
      createdAt: record.createdAt,
      status: record.status,
    }));
}

export function latestTemplateVersion(
  records: TemplateFamilyRecord[],
  templateId: string,
): TemplateFamilyRecord | undefined {
  return listTemplateVersions(records, templateId).length
    ? records
        .filter((record) => record.templateId === templateId)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0]
    : undefined;
}
