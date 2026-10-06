import { useEffect, useState } from "react";
import { Check, Download, Sparkles, Upload } from "lucide-react";
import { api } from "../../shared/api/api";
import {
  applySkill,
  EVENT_CAMPAIGN_SKILL,
  exportSkillPackage,
  importSkillPackage,
  normalizeBrand,
  readGuestBrand,
  readGuestSkills,
  readGuestTemplates,
  skillNeedsUpgrade,
  writeGuestSkills,
  type BrandSystem,
  type SkillApplyResult,
  type SkillManifest,
  type VersionedTemplate,
} from "../../domain/design/designSystem";
import type { Project } from "../../domain/design/model";

export default function SkillsPanel({
  project,
  onApply,
  onMessage,
}: {
  project: Project;
  onApply: (result: SkillApplyResult) => void;
  onMessage: (message: string) => void;
}) {
  const [skills, setSkills] = useState<SkillManifest[]>([EVENT_CAMPAIGN_SKILL]);
  const [selectedId, setSelectedId] = useState(EVENT_CAMPAIGN_SKILL.id);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [brand, setBrand] = useState<BrandSystem>(readGuestBrand());
  const [templates, setTemplates] = useState<VersionedTemplate[]>([]);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    void api<{ skills: SkillManifest[] }>("/skills")
      .then((r) =>
        setSkills(r.skills.length ? r.skills : [EVENT_CAMPAIGN_SKILL]),
      )
      .catch(() => setSkills(readGuestSkills()));
    void api<BrandSystem>("/brand")
      .then((b) => setBrand(normalizeBrand(b)))
      .catch(() => setBrand(readGuestBrand()));
    void api<{ templates: VersionedTemplate[] }>("/templates")
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates(readGuestTemplates()));
  }, []);

  const skill = skills.find((s) => s.id === selectedId) || EVENT_CAMPAIGN_SKILL;
  const pinnedTemplate = templates.find(
    (t) =>
      t.id === (skill.templateRef?.id || project.templateRef?.id) &&
      (!skill.templateRef || t.version === skill.templateRef.version),
  );
  const latestSkill =
    skills
      .filter((s) => s.id === skill.id)
      .sort((a, b) => b.version - a.version)[0] || skill;
  const needsUpgrade = skillNeedsUpgrade(project, latestSkill);
  const sample =
    skill.sampleManuscripts[previewIndex] || skill.sampleManuscripts[0] || "";

  function runApply(manuscript: string, base?: Project) {
    try {
      setError("");
      const result = applySkill(skill, manuscript, {
        brand,
        template: pinnedTemplate,
        base,
      });
      if (result.missingRequired.length) {
        setError(
          `Missing required sections: ${result.missingRequired.join(", ")}`,
        );
        return;
      }
      onApply(result);
      onMessage(
        `Applied ${skill.name} v${skill.version}. ${result.mapped.length} sections accounted for.`,
      );
      setUpgradeOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="skills-panel panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Workflows</h2>
          <span className="small-pill">{skills.length}</span>
        </div>
        <p className="panel-description">
          Saved brand + template packages. Upgrades stay explicit.
        </p>
      </div>
      <div className="project-list">
        {skills.map((s) => (
          <button
            key={`${s.id}-v${s.version}`}
            type="button"
            className={`saved-project ${selectedId === s.id ? "selected" : ""}`}
            onClick={() => setSelectedId(s.id)}
          >
            <span>
              <strong>{s.name}</strong>
              <small>
                v{s.version} · {s.status} · {s.family}
              </small>
            </span>
          </button>
        ))}
      </div>
      <div className="info-card">
        <Sparkles size={18} strokeWidth={1.75} />
        <div>
          <strong>{skill.name}</strong>
          <p>{skill.purpose}</p>
        </div>
      </div>
      {skill.instructions && (
        <details className="inspector-advanced">
          <summary>How this workflow works</summary>
          <p className="quiet-note">{skill.instructions}</p>
        </details>
      )}
      {skill.sampleManuscripts.length > 0 && (
        <div className="panel-section">
          <div className="library-label">Sample</div>
          <label className="form-label">
            Preview sample
            <select
              aria-label="Workflow sample manuscript"
              value={previewIndex}
              onChange={(e) => setPreviewIndex(Number(e.target.value))}
            >
              {skill.sampleManuscripts.map((_, i) => (
                <option key={i} value={i}>
                  Sample {i + 1}
                </option>
              ))}
            </select>
          </label>
          <pre className="skill-sample">{sample}</pre>
          <button
            type="button"
            className="button secondary full-width"
            onClick={() => runApply(sample)}
          >
            <Check size={16} strokeWidth={1.75} />
            Apply sample {previewIndex + 1}
          </button>
        </div>
      )}
      <button
        type="button"
        className="button primary full-width"
        onClick={() => runApply(project.manuscript || sample, project)}
      >
        Apply to current manuscript
      </button>
      {needsUpgrade && (
        <div className="inline-warning">
          This design pins {project.skillRef?.id} v{project.skillRef?.version}.
          Latest is v{latestSkill.version}.
          <button
            type="button"
            className="text-button"
            onClick={() => setUpgradeOpen(true)}
          >
            Review upgrade
          </button>
        </div>
      )}
      {upgradeOpen && (
        <div className="info-card">
          <div>
            <strong>Upgrade review</strong>
            <p>
              Pinned v{project.skillRef?.version} → latest v
              {latestSkill.version}. Template/theme: {skill.themeId} /{" "}
              {latestSkill.themeId}. Required labels:{" "}
              {latestSkill.requiredLabels.join(", ") || "none"}.
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                runApply(project.manuscript || sample, {
                  ...project,
                  skillRef: undefined,
                })
              }
            >
              Accept upgrade and re-apply
            </button>
          </div>
        </div>
      )}
      <div className="panel-section">
        <div className="library-label">Package</div>
        <div className="custom-size-inputs">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const pack = exportSkillPackage(skill);
              const blob = new Blob([JSON.stringify(pack, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${skill.id}.forma-skill.json`;
              a.click();
              URL.revokeObjectURL(url);
              onMessage("Workflow package downloaded.");
            }}
          >
            <Download size={16} strokeWidth={1.75} />
            Export
          </button>
          <label className="button secondary">
            <Upload size={16} strokeWidth={1.75} />
            Import
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const imported = importSkillPackage(
                    JSON.parse(await file.text()),
                  );
                  const next = [
                    imported,
                    ...skills.filter((s) => s.id !== imported.id),
                  ];
                  setSkills(next);
                  writeGuestSkills(next);
                  try {
                    await api(`/skills/${imported.id}`, {
                      method: "PUT",
                      body: JSON.stringify({ skill: imported }),
                    });
                  } catch {
                    /* guest or offline */
                  }
                  setSelectedId(imported.id);
                  onMessage(`Imported ${imported.name}.`);
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            />
          </label>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
