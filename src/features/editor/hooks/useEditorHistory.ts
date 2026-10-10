import { useState, type Dispatch, type SetStateAction } from "react";
import type { Project } from "../../../domain/design/model";
import { syncProjectAfterEdit } from "../../../domain/design-spec/sync";

/** Local undo history for edits to one open project. Persistence remains separate. */
export function useEditorHistory({
  project,
  setProject,
  setDraft,
  onFamilyChange,
}: {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  setDraft: Dispatch<SetStateAction<string>>;
  onFamilyChange: () => void;
}) {
  const [history, setHistory] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);

  function resetHistory() {
    setHistory([]);
    setFuture([]);
  }

  function update(patch: Partial<Project>) {
    if (patch.family && patch.family !== project.family) onFamilyChange();
    setHistory((previous) => [...previous.slice(-39), project]);
    setFuture([]);
    const merged = {
      ...project,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setProject(syncProjectAfterEdit(project, merged));
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((next) => [project, ...next]);
    setHistory((next) => next.slice(0, -1));
    setProject(previous);
    setDraft(previous.manuscript);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((previous) => [...previous, project]);
    setFuture((previous) => previous.slice(1));
    setProject(next);
    setDraft(next.manuscript);
  }

  return { history, future, resetHistory, update, undo, redo };
}
