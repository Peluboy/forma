import {
  CheckCircle2,
  Columns2,
  ImagePlus,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { IconButton } from "../../../shared/components/ui";
import {
  fieldIds,
  labels,
  type FieldId,
  type Project,
} from "../../../domain/design/model";

export type AnalysisProvider = "local" | "openai" | "gemini";

export function EditorReferencePanel({
  project,
  compare,
  provider,
  available,
  analyzing,
  analysisError,
  drawing,
  onChooseFile,
  onUploadFile,
  onRemove,
  onCompare,
  onUseReference,
  onProvider,
  onAnalyze,
  onDrawArea,
}: {
  project: Project;
  compare: boolean;
  provider: AnalysisProvider;
  available: Record<AnalysisProvider, boolean>;
  analyzing: boolean;
  analysisError: string;
  drawing: FieldId | null;
  onChooseFile: () => void;
  onUploadFile: (file: File) => void;
  onRemove: () => void;
  onCompare: () => void;
  onUseReference: () => void;
  onProvider: (provider: AnalysisProvider) => void;
  onAnalyze: () => void;
  onDrawArea: (field: FieldId) => void;
}) {
  return (
    <div className="panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Reference</h2>
          <ScanLine size={18} strokeWidth={1.75} />
        </div>
      </div>
      <button
        type="button"
        className="upload-zone"
        onClick={onChooseFile}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) onUploadFile(file);
        }}
      >
        <div className="upload-icon">
          <ImagePlus size={20} strokeWidth={1.75} />
        </div>
        <strong>
          {project.reference ? "Replace reference" : "Drop your reference here"}
        </strong>
        <span>or click to browse</span>
        <small>JPG, PNG, WebP · up to 2 MB</small>
      </button>
      {project.reference && (
        <div className="panel-stack">
          <img
            className="reference-preview"
            src={project.reference}
            alt="Uploaded design reference"
          />
          <div className="reference-file">
            <span>{project.referenceName}</span>
            <IconButton label="Remove reference" onClick={onRemove}>
              <X size={15} />
            </IconButton>
          </div>
          <button
            type="button"
            className="button secondary full-width"
            onClick={onCompare}
          >
            <Columns2 size={16} strokeWidth={1.75} />
            {compare ? "Hide comparison" : "Compare with design"}
          </button>
          <button
            type="button"
            className="button primary full-width"
            onClick={onUseReference}
          >
            <ScanLine size={16} strokeWidth={1.75} />
            {project.designMode === "reference"
              ? "Mark headline area"
              : "Use reference as canvas"}
          </button>
          <div className="panel-section">
            <div className="library-label">Text detection</div>
            <div className="analysis-controls">
              <label className="form-label">
                Provider
                <select
                  aria-label="Analysis provider"
                  value={provider}
                  onChange={(event) =>
                    onProvider(event.target.value as AnalysisProvider)
                  }
                >
                  <option value="local" disabled={!available.local}>
                    Local OCR
                  </option>
                  <option value="gemini" disabled={!available.gemini}>
                    Gemini vision
                  </option>
                  <option value="openai" disabled={!available.openai}>
                    OpenAI vision
                  </option>
                </select>
              </label>
              <button
                type="button"
                className="button secondary full-width"
                disabled={analyzing || !available[provider]}
                onClick={onAnalyze}
              >
                {analyzing ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Sparkles size={16} strokeWidth={1.75} />
                )}{" "}
                {analyzing ? "Finding text areas…" : "Detect text areas"}
              </button>
              {provider === "gemini" && (
                <p className="quiet-note">
                  Your reference image will be sent to Google Gemini. Manuscript
                  text is not sent. Google’s free tier may use submitted content
                  to improve its products; use non-confidential references.
                </p>
              )}
              {provider === "openai" && (
                <p className="quiet-note">
                  Your reference image will be sent to OpenAI for analysis.
                  Manuscript text is not sent.
                </p>
              )}
              {analysisError && (
                <p className="form-error" role="alert">
                  {analysisError}
                </p>
              )}
            </div>
          </div>
          {project.designMode === "reference" && (
            <div className="panel-section">
              <div className="library-label">Text areas</div>
              <div className="content-field-list" role="list">
                {fieldIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="listitem"
                    className={`button full-width ${drawing === id ? "selected" : ""}`}
                    onClick={() => onDrawArea(id)}
                  >
                    {project.mappedFields?.includes(id) ? (
                      <CheckCircle2 size={14} strokeWidth={1.75} />
                    ) : (
                      <ScanLine size={14} strokeWidth={1.75} />
                    )}{" "}
                    {labels[id]}
                    <span style={{ marginLeft: "auto", opacity: 0.7 }}>
                      {project.mappedFields?.includes(id) ? "Mapped" : "Draw"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="info-card">
        <ShieldCheck size={18} strokeWidth={1.75} />
        <div>
          <strong>Guide only</strong>
          <p>
            Mark old text, then place your approved copy. Pixels outside marked
            areas stay untouched.
          </p>
        </div>
      </div>
      <p className="quiet-note">
        Works best on solid backgrounds. Complex backgrounds may need
        retouching. Detection proposes areas for review; it does not recover
        hidden artwork.
      </p>
    </div>
  );
}
