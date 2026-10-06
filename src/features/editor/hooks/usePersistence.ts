import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type User } from "../../../shared/api/api";
import {
  encodeStoredProject,
  readStoredProjectList,
} from "../../../domain/design/documentRuntime";
import {
  createProject,
  isProject,
  type Project,
} from "../../../domain/design/model";
export const LOCAL_STORE = "forma.projects.v1";
export function readLocalProjects(): Project[] {
  try {
    return readStoredProjectList(
      JSON.parse(localStorage.getItem(LOCAL_STORE) || "[]"),
    );
  } catch {
    return [];
  }
}
function writeLocalProjects(projects: Project[]) {
  localStorage.setItem(
    LOCAL_STORE,
    JSON.stringify(projects.map((project) => encodeStoredProject(project))),
  );
}
type Envelope = { project: Project; version: number };
export function usePersistence(
  project: Project,
  onLoad: (p: Project) => void,
  user: User | null,
  sessionReady: boolean,
) {
  const [projects, setProjects] = useState<Project[]>(readLocalProjects);
  const [saved, setSaved] = useState("Opening workspace…");
  const [scope, setScope] = useState("");
  const [conflict, setConflict] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const deleted = useRef(new Set<string>());
  const versions = useRef(new Map<string, number>());
  const persisted = useRef(new Map<string, string>());
  const generation = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const current = useRef(project);
  current.current = project;
  const loader = useRef(onLoad);
  loader.current = onLoad;
  const key = user?.id || "guest";
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    generation.current++;
    versions.current.clear();
    persisted.current.clear();
    setScope("");
    setConflict(false);
    setLoadError("");
    const requested = new URLSearchParams(location.search).get("project");
    const previous = previousUser.current;
    previousUser.current = user?.id || null;
    const guestDraft =
      previous === null || previous === user?.id
        ? current.current
        : createProject();
    setProjects([]);
    if (previous && previous !== user?.id) loader.current(createProject());
    if (!user) {
      const local = readLocalProjects();
      setProjects(local);
      local.forEach((p) => persisted.current.set(p.id, JSON.stringify(p)));
      if (requested && !local.some((p) => p.id === requested)) {
        setLoadError(
          "This design is unavailable. Return to My designs to choose another.",
        );
        return;
      }
      loader.current(
        local.find((p) => p.id === requested) || local[0] || createProject(),
      );
      setScope("guest");
      return;
    }
    setSaved("Opening your projects…");
    void api<{ projects: Envelope[] }>("/projects")
      .then(({ projects: rows }) => {
        if (cancelled) return;
        const valid = rows.filter((r) => isProject(r.project));
        valid.forEach((r) => {
          versions.current.set(r.project.id, r.version);
          persisted.current.set(r.project.id, JSON.stringify(r.project));
        });
        setProjects(valid.map((r) => r.project));
        if (requested && !valid.some((r) => r.project.id === requested))
          throw new Error(
            "This design is unavailable. Return to My designs to choose another.",
          );
        const selected =
          valid.find((r) => r.project.id === requested) || valid[0];
        if (selected) loader.current(selected.project);
        else
          loader.current({
            ...guestDraft,
            id: crypto.randomUUID(),
            updatedAt: new Date().toISOString(),
          });
        setScope(user.id);
        setSaved("Saved to your account");
      })
      .catch((e) => {
        if (!cancelled) {
          setSaved("Account storage unavailable");
          setLoadError(e.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, sessionReady, retryTick]);
  const saveNow = useCallback(async (): Promise<Envelope | null> => {
    if (scope !== key)
      throw new Error("Your account workspace is still loading.");
    const snapshot = current.current;
    if (deleted.current.has(snapshot.id))
      throw new Error("This design was deleted.");
    const stamp = JSON.stringify(snapshot);
    const epoch = generation.current;
    if (!user) {
      try {
        const all = [
          snapshot,
          ...readLocalProjects().filter((p) => p.id !== snapshot.id),
        ].slice(0, 12);
        writeLocalProjects(all);
        persisted.current.set(snapshot.id, stamp);
        setProjects(all);
        setSaved("Saved on this device");
        return null;
      } catch {
        setSaved("Not saved · storage full");
        throw new Error("Browser storage is full. Export a project backup.");
      }
    }
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (deleted.current.has(snapshot.id))
          throw new Error("This design was deleted.");
        if (epoch !== generation.current)
          throw new Error("Account changed during save.");
        if (persisted.current.get(snapshot.id) === stamp) {
          setSaved("Saved to your account");
          return {
            project: snapshot,
            version: versions.current.get(snapshot.id) || 0,
          };
        }
        setSaved("Saving to your account…");
        try {
          const result = await api<Envelope>(
            `/projects/${encodeURIComponent(snapshot.id)}`,
            {
              method: "PUT",
              body: JSON.stringify({
                project: snapshot,
                expectedVersion: versions.current.get(snapshot.id) || 0,
              }),
            },
          );
          if (epoch === generation.current) {
            versions.current.set(snapshot.id, result.version);
            persisted.current.set(snapshot.id, stamp);
            setProjects((p) => [
              snapshot,
              ...p.filter((x) => x.id !== snapshot.id),
            ]);
            setSaved(
              current.current === snapshot
                ? "Saved to your account"
                : "Changes pending…",
            );
            setConflict(false);
          }
          return result;
        } catch (e) {
          if (epoch === generation.current) {
            setSaved(
              e instanceof ApiError && e.status === 409
                ? "Save conflict · action needed"
                : "Not synced · retry needed",
            );
            if (e instanceof ApiError && e.status === 409) setConflict(true);
          }
          throw e;
        }
      });
    queue.current = task;
    return task;
  }, [scope, key, user?.id]);
  useEffect(() => {
    if (scope !== key || !sessionReady || conflict) return;
    setSaved(user ? "Changes pending…" : "Saving…");
    const timer = setTimeout(
      () => {
        void saveNow().catch(() => {});
      },
      user ? 850 : 450,
    );
    return () => clearTimeout(timer);
  }, [project, scope, key, user?.id, sessionReady, conflict, saveNow]);
  useEffect(() => {
    if (scope !== "guest" || user) return;
    const flushGuestDraft = () => {
      const snapshot = current.current;
      if (deleted.current.has(snapshot.id)) return;
      if (persisted.current.get(snapshot.id) === JSON.stringify(snapshot))
        return;
      try {
        writeLocalProjects(
          [
            snapshot,
            ...readLocalProjects().filter((saved) => saved.id !== snapshot.id),
          ].slice(0, 12),
        );
      } catch {
        // The visible save status reports storage failure during normal editing.
      }
    };
    window.addEventListener("pagehide", flushGuestDraft);
    return () => window.removeEventListener("pagehide", flushGuestDraft);
  }, [scope, user?.id]);
  async function remove(id: string) {
    deleted.current.add(id);
    await queue.current.catch(() => {});
    try {
      if (user)
        await api(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
      else writeLocalProjects(readLocalProjects().filter((p) => p.id !== id));
      versions.current.delete(id);
      persisted.current.delete(id);
      setProjects((p) => p.filter((x) => x.id !== id));
      if (current.current.id === id) loader.current(createProject());
    } catch (e) {
      deleted.current.delete(id);
      throw e;
    }
  }
  async function loadRemote() {
    const result = await api<Envelope>(
      `/projects/${encodeURIComponent(project.id)}`,
    );
    versions.current.set(project.id, result.version);
    persisted.current.set(project.id, JSON.stringify(result.project));
    loader.current(result.project);
    setConflict(false);
    setSaved("Loaded saved version");
  }
  function keepAsCopy() {
    setConflict(false);
    loader.current({
      ...current.current,
      id: crypto.randomUUID(),
      name: `${current.current.name} (copy)`,
      updatedAt: new Date().toISOString(),
    });
  }
  return {
    projects,
    saved:
      scope === key &&
      saved.startsWith("Saved") &&
      persisted.current.get(project.id) !== JSON.stringify(project)
        ? "Changes pending…"
        : saved,
    saveNow,
    remove,
    conflict,
    loadRemote,
    keepAsCopy,
    loadError,
    retry: () => setRetryTick((t) => t + 1),
    isReady: scope === key,
  };
}
