import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import {
  canvasHeight,
  fieldIds,
  labels,
  type FieldId,
  type Project,
} from "../../../domain/design/model";
import { Button } from "../../../shared/components/ui/Button";

export type Region = {
  id: string;
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  fontSize: number;
  fontFamily: "Arial" | "Georgia";
  textColor: string;
  coverColor: string;
  field: FieldId | null;
};
export type Analysis = {
  regions: Region[];
  warnings: string[];
  provider: string;
};
export default function AnalysisReview({
  analysis,
  project,
  onApply,
}: {
  analysis: Analysis;
  project: Project;
  onApply: (p: Partial<Project>) => void;
}) {
  const [regions, setRegions] = useState(
    analysis.regions.map((r) => ({
      ...r,
      box: {
        x: Math.max(0, r.box.x - 3),
        y: Math.max(0, r.box.y - 3),
        width: Math.min(720 - Math.max(0, r.box.x - 3), r.box.width + 6),
        height: Math.min(900 - Math.max(0, r.box.y - 3), r.box.height + 10),
      },
    })),
  );
  const mapped = regions.filter((r) => r.field);
  const duplicate = mapped.some(
    (r, i) => mapped.findIndex((x) => x.field === r.field) !== i,
  );
  function apply() {
    if (duplicate) return;
    const layouts = { ...project.layouts },
      covers = { ...project.covers };
    for (const r of mapped) {
      layouts[r.field!] = {
        ...layouts[r.field!],
        ...r.box,
        size: Math.max(
          11,
          Math.min(180, (r.fontSize * canvasHeight(project)) / 900),
        ),
        color: r.textColor,
        fontFamily: r.fontFamily,
        locked: false,
      };
      covers[r.field!] = r.coverColor;
    }
    onApply({
      designMode: "reference",
      layouts,
      covers,
      mappedFields: mapped.map((r) => r.field!),
    });
  }
  return (
    <div className="analysis-review">
      <p className="text-xs leading-[1.8] text-text-tertiary mt-[10px] mb-6">
        Review detected text areas before replacing anything. Your manuscript
        wording will be used exactly; detected text is only a guide.
      </p>
      <div className="analysis-layout">
        <div className="analysis-image">
          <img
            src={project.reference!}
            alt="Reference with detected text regions"
          />
          {regions.map((r, i) => (
            <div
              key={r.id}
              style={{
                left: `${r.box.x / 7.2}%`,
                top: `${r.box.y / 9}%`,
                width: `${r.box.width / 7.2}%`,
                height: `${r.box.height / 9}%`,
              }}
            >
              <span>{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="analysis-regions">
          {regions.map((r, i) => (
            <div className="analysis-region" key={r.id}>
              <div>
                <span className="region-number">{i + 1}</span>
                <p>{r.text}</p>
                <small>{Math.round(r.confidence * 100)}% confidence</small>
              </div>
              <label className="analysis-region label">
                Replace with
                <select
                  aria-label={`Map region ${i + 1}`}
                  value={r.field || ""}
                  onChange={(e) =>
                    setRegions((rs) =>
                      rs.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              field: (e.target.value || null) as FieldId | null,
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="">Keep original / skip</option>
                  {fieldIds.map((id) => (
                    <option value={id} key={id}>
                      {labels[id]}
                      {project.copy[id] ? "" : " (empty)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>
      {analysis.warnings.map((w, i) => (
        <p className="analysis-warning" key={i}>
          <AlertCircle size={14} />
          {w}
        </p>
      ))}
      {duplicate && (
        <p className="text-[11px] leading-[1.65] text-danger bg-danger-muted rounded-[7px] p-[11px] my-3">
          Assign each manuscript field to only one region. Re-mark a larger area
          manually if multiple regions belong together.
        </p>
      )}
      <Button
        variant="primary"
        fullWidth
        className="mt-4"
        disabled={!mapped.length || duplicate}
        onClick={apply}
      >
        <Check size={16} />
        Use {mapped.length} mapped text areas
      </Button>
      <p className="text-[10px] text-text-tertiary leading-[1.75] my-4">
        This replaces approved regions with solid-color covers and editable
        text. Font matches are approximations. Unselected regions remain in the
        original image.
      </p>
    </div>
  );
}
