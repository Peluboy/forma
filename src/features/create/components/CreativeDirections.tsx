import { ArrowRight, Sparkles } from "lucide-react";
import type { Project } from "../../../domain/design/model";
import type { CreativeConcept } from "../../../domain/design/creativeDesign";
import { Button } from "../../../shared/components/ui/Button";
import Poster from "../../editor/components/Poster";
import { DocumentPageView } from "../../editor/canvas/DocumentCanvas";
import { SlideView } from "../../editor/canvas/PresentationCanvas";

export function CreativeDirections({
  concepts,
  projects,
  onOpen,
}: {
  concepts: CreativeConcept[];
  projects: Project[];
  onOpen: (index: number) => void;
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-border bg-bg-panel p-5 md:p-7"
      aria-label="Design directions"
    >
      <div className="flex items-start justify-between gap-5 border-b border-border pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            Directions
          </span>
          <h2 className="mt-1 mb-0 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.055em]">
            Choose a starting point.
          </h2>
        </div>
        <span className="rounded-full bg-bg-muted px-3 py-1 text-xs text-text-secondary">
          Exact copy
        </span>
      </div>
      {concepts.length === 0 ? (
        <div className="grid min-h-[480px] place-items-center text-center">
          <div>
            <Sparkles size={30} className="mx-auto mb-4 text-accent" />
            <p className="m-0 text-sm font-semibold">
              Your directions will appear here.
            </p>
            <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-6 text-text-secondary">
              Add your words and create designs to compare their layouts and
              visual styles.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {concepts.map((concept, index) => {
            const project = projects[index];
            return (
              <article
                key={concept.id}
                className="min-w-0 overflow-hidden rounded-xl border border-border bg-bg-page"
              >
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-bg-muted [&_svg]:h-full [&_svg]:w-full">
                  {project.family === "document" && project.flow ? (
                    <DocumentPageView
                      flow={project.flow}
                      page={project.flow.pages[0]}
                      pageNumber={1}
                      total={project.flow.pages.length}
                      miniature
                    />
                  ) : project.family === "presentation" &&
                    project.presentation ? (
                    <SlideView
                      deck={project.presentation}
                      slide={project.presentation.slides[0]}
                      miniature
                    />
                  ) : (
                    <Poster project={project} miniature />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="m-0 font-[var(--font-display)] text-lg font-semibold tracking-[-0.04em]">
                    {concept.name}
                  </h3>
                  <p className="min-h-12 text-xs leading-5 text-text-secondary">
                    {concept.rationale}
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => onOpen(index)}
                  >
                    Open and review <ArrowRight size={15} />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
