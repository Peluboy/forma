import type { RefObject } from "react";
import { readDesignFile } from "../../../domain/design/document";
import type { Project } from "../../../domain/design/model";

/** Hidden native inputs shared by the editor header and side panels. */
export function EditorFileInputs({
  manuscriptInput,
  referenceInput,
  projectInput,
  onManuscript,
  onReference,
  onProject,
  onMessage,
}: {
  manuscriptInput: RefObject<HTMLInputElement | null>;
  referenceInput: RefObject<HTMLInputElement | null>;
  projectInput: RefObject<HTMLInputElement | null>;
  onManuscript: (file?: File) => void;
  onReference: (file?: File) => void;
  onProject: (project: Project) => void;
  onMessage: (message: string) => void;
}) {
  return (
    <>
      <input
        ref={manuscriptInput}
        type="file"
        accept=".txt,.md,.docx,.pdf"
        hidden
        onChange={(event) => {
          onManuscript(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={referenceInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          onReference(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            if (file.size > 4 * 1024 * 1024)
              throw new Error(
                "This file is too large. Choose a Forma file under 4 MB.",
              );
            let data: unknown;
            try {
              data = JSON.parse(await file.text());
            } catch {
              throw new Error(
                "This file could not be read. Choose an editable Forma backup.",
              );
            }
            onProject(readDesignFile(data));
          } catch (error) {
            onMessage(
              error instanceof Error
                ? error.message
                : "Please choose a valid Forma design file.",
            );
          }
        }}
      />
    </>
  );
}
