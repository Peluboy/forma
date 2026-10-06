import {
  addSlide,
  createPresentationProject,
  PRESENTATION_ADAPTERS,
  presentationIssues,
  removeSlide,
  repaginatePresentation,
  type PresentationDeck,
} from "../../../domain/design/presentation";
import { SlideView } from "../canvas/PresentationCanvas";
import type { Project } from "../../../domain/design/model";
import { Presentation, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../dialogs/ConfirmDialog";

export default function PresentationPanel({
  project,
  update,
  onCreate,
  onMessage,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
  onCreate: (project: Project) => Promise<void>;
  onMessage: (msg: string) => void;
}) {
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const deck = project.presentation;
  if (!deck) {
    return (
      <div className="presentation-panel panel-body">
        <div className="panel-stack">
          <div className="panel-heading">
            <h2>Slides</h2>
            <Presentation size={18} strokeWidth={1.75} />
          </div>
          <p className="panel-description">
            Turn your Content into a slide deck.
          </p>
        </div>
        <button
          type="button"
          className="button primary full-width"
          disabled={!project.manuscript.trim()}
          onClick={() => {
            const next = createPresentationProject(
              project.manuscript,
              `${project.name || "Untitled design"} slides`,
            );
            void onCreate(next);
          }}
        >
          Create slides from Content
        </button>
        {!project.manuscript.trim() && (
          <p className="quiet-note">Add Content first, then create slides.</p>
        )}
      </div>
    );
  }

  const issues = presentationIssues(project);
  const active =
    deck.slides.find((s) => s.id === deck.activeSlideId) || deck.slides[0];

  function setDeck(next: PresentationDeck) {
    update({
      family: "presentation",
      presentation: next,
      format: "custom",
      pageSize: next.pageSize,
    });
  }
  function editActive(patch: Partial<typeof active>) {
    if (!deck) return;
    setDeck({
      ...deck,
      slides: deck.slides.map((slide) =>
        slide.id === active.id ? { ...slide, ...patch } : slide,
      ),
    });
  }

  return (
    <div className="presentation-panel panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Slides</h2>
          <span className="small-pill">{deck.slides.length}</span>
        </div>
        <p className="panel-description">
          Download as PDF or an editable PowerPoint file.
        </p>
      </div>
      <div className="doc-thumb-list">
        {deck.slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`doc-thumb ${slide.id === active.id ? "selected" : ""}`}
            onClick={() => setDeck({ ...deck, activeSlideId: slide.id })}
            aria-label={`Open slide ${i + 1}`}
          >
            <SlideView deck={deck} slide={slide} miniature />
            <span>
              {i + 1}. {slide.layout}
              {slide.hidden ? " · hidden" : ""}
            </span>
          </button>
        ))}
      </div>
      <div className="custom-size-inputs">
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            try {
              setDeck(addSlide(deck));
              onMessage("Slide added.");
            } catch (e) {
              onMessage((e as Error).message);
            }
          }}
        >
          <Plus size={15} strokeWidth={1.75} />
          Add slide
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={deck.slides.length <= 1}
          onClick={() => {
            try {
              setDeck(removeSlide(deck, active.id));
              onMessage("Slide removed.");
            } catch (e) {
              onMessage((e as Error).message);
            }
          }}
        >
          <Trash2 size={15} strokeWidth={1.75} />
          Remove
        </button>
      </div>
      <div className="panel-section">
        <div className="library-label">Selected slide</div>
        <label className="form-label">
          Title
          <textarea
            aria-label="Slide title"
            rows={2}
            value={active.title}
            maxLength={300}
            onChange={(e) => editActive({ title: e.target.value })}
          />
        </label>
        {active.layout !== "chart" && (
          <label className="form-label">
            Text
            <textarea
              aria-label="Slide text"
              rows={5}
              value={active.body}
              onChange={(e) => editActive({ body: e.target.value })}
            />
          </label>
        )}
        {active.layout === "two-column" && (
          <label className="form-label">
            Right column
            <textarea
              aria-label="Right column"
              rows={4}
              value={active.secondary}
              onChange={(e) => editActive({ secondary: e.target.value })}
            />
          </label>
        )}
        {active.layout === "chart" && (
          <p className="quiet-note">
            Update chart data in Content, then update slides.
          </p>
        )}
        <details className="inspector-advanced">
          <summary>Speaker notes</summary>
          <textarea
            aria-label="Speaker notes"
            rows={4}
            value={active.notes}
            onChange={(e) => editActive({ notes: e.target.value })}
          />
        </details>
      </div>
      <button
        type="button"
        className="button secondary full-width"
        disabled={!project.manuscript.trim()}
        onClick={() => setConfirmRebuild(true)}
      >
        Update slides from Content
      </button>
      {confirmRebuild && (
        <ConfirmDialog
          title="Update slides from Content?"
          message="This will replace your slide edits. Your Content stays the same."
          confirmLabel="Update slides"
          onCancel={() => setConfirmRebuild(false)}
          onConfirm={() => {
            const next = repaginatePresentation(project.manuscript, deck.theme);
            setDeck(next);
            setConfirmRebuild(false);
            onMessage("Slides rebuilt from manuscript.");
          }}
        />
      )}
      {active.notes ? (
        <p className="quiet-note">
          <strong>Notes:</strong> {active.notes}
        </p>
      ) : null}
      {issues.length > 0 && (
        <ul className="form-error">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <details className="inspector-advanced">
        <summary>About slide exports</summary>
        <ul className="team-member-list">
          {PRESENTATION_ADAPTERS.map((a) => (
            <li key={a.id}>
              <span>
                {a.name}
                <small>{a.fidelityLimits[0]}</small>
              </span>
              <small>{a.format.toUpperCase()}</small>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
