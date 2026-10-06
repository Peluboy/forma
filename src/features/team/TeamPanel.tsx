import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { api } from "../../shared/api/api";
import type { User } from "../../shared/api/api";
import type { Project } from "../../domain/design/model";
import type {
  AuditEvent,
  Publication,
  Workspace,
  WorkspaceRole,
} from "../../domain/team/teamOps";

type WorkspaceRow = Workspace & { myRole: WorkspaceRole };

export default function TeamPanel({
  user,
  project,
  saveNow,
  onMessage,
}: {
  user: User | null;
  project: Project;
  saveNow?: () => Promise<unknown>;
  onMessage: (message: string) => void;
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("reviewer");
  const [publications, setPublications] = useState<Publication[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selected =
    workspaces.find((w) => w.id === selectedId) || workspaces[0] || null;

  async function refresh() {
    const r = await api<{ workspaces: WorkspaceRow[] }>("/workspaces");
    setWorkspaces(r.workspaces);
    const nextId =
      selectedId && r.workspaces.some((w) => w.id === selectedId)
        ? selectedId
        : r.workspaces[0]?.id || "";
    setSelectedId(nextId);
    if (nextId) {
      const [pubs, log] = await Promise.all([
        api<{ publications: Publication[] }>(
          `/workspaces/${nextId}/publications`,
        ),
        api<{ audit: AuditEvent[] }>(`/workspaces/${nextId}/audit`).catch(
          () => ({ audit: [] as AuditEvent[] }),
        ),
      ]);
      setPublications(pubs.publications);
      setAudit(log.audit);
    } else {
      setPublications([]);
      setAudit([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    void refresh().catch((e) => setError((e as Error).message));
  }, [user?.id]);

  useEffect(() => {
    if (!user || !selectedId) return;
    void Promise.all([
      api<{ publications: Publication[] }>(
        `/workspaces/${selectedId}/publications`,
      ),
      api<{ audit: AuditEvent[] }>(`/workspaces/${selectedId}/audit`).catch(
        () => ({ audit: [] as AuditEvent[] }),
      ),
    ])
      .then(([pubs, log]) => {
        setPublications(pubs.publications);
        setAudit(log.audit);
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedId, user?.id]);

  if (!user) {
    return (
      <div className="team-panel panel-body">
        <div className="panel-stack">
          <div className="panel-heading">
            <h2>Team</h2>
            <Users size={18} strokeWidth={1.75} />
          </div>
          <p className="panel-description">Sign in to manage workspaces.</p>
        </div>
        <div className="project-empty">
          <Users size={24} strokeWidth={1.75} />
          <h3>Workspace access</h3>
          <p>
            Sign in to create workspaces, invite members, and publish reviews.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-panel panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Team</h2>
          <Users size={18} strokeWidth={1.75} />
        </div>
        <p className="panel-description">
          Shared publications and signed approvals.
        </p>
      </div>

      <div className="panel-section">
        <div className="library-label">Workspace</div>
        <label className="form-label">
          New workspace
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agency studio"
            maxLength={80}
          />
        </label>
        <button
          type="button"
          className="button primary full-width"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const r = await api<{ workspace: Workspace }>("/workspaces", {
                method: "POST",
                body: JSON.stringify({ name }),
              });
              setName("");
              setSelectedId(r.workspace.id);
              await refresh();
              onMessage(`Workspace “${r.workspace.name}” created.`);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Plus size={16} strokeWidth={1.75} />
          Create workspace
        </button>

        {workspaces.length > 0 && (
          <label className="form-label">
            Active workspace
            <select
              value={selected?.id || ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.myRole})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {selected && (
        <>
          <div className="panel-section">
            <div className="library-label">Members</div>
            <ul className="team-member-list">
              {selected.members.map((m) => (
                <li key={m.userId}>
                  <span>
                    {m.name} · {m.email}
                  </span>
                  <small>{m.role}</small>
                </li>
              ))}
            </ul>
            {selected.myRole === "owner" && (
              <div className="panel-stack">
                <label className="form-label">
                  Invite by email
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                  />
                </label>
                <label className="form-label">
                  Role
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as WorkspaceRole)
                    }
                  >
                    <option value="editor">Editor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="button secondary full-width"
                  disabled={busy || !inviteEmail.trim()}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api(`/workspaces/${selected.id}/members`, {
                        method: "POST",
                        body: JSON.stringify({
                          email: inviteEmail,
                          role: inviteRole,
                        }),
                      });
                      setInviteEmail("");
                      await refresh();
                      onMessage("Member invited.");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Add member
                </button>
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="library-label">Publish</div>
            <p className="quiet-note">
              Pins this design into the workspace and opens an authenticated
              review link.
            </p>
            <button
              type="button"
              className="button secondary full-width"
              disabled={busy || !["owner", "editor"].includes(selected.myRole)}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (saveNow) await saveNow();
                  await api(`/workspaces/${selected.id}/publish`, {
                    method: "POST",
                    body: JSON.stringify({
                      kind: "project",
                      sourceId: project.id,
                      pinnedVersion: 1,
                      name: project.name || "Untitled design",
                      snapshot: project,
                    }),
                  });
                  const link = await api<{
                    token: string;
                    url: string;
                  }>(`/projects/${project.id}/reviews`, {
                    method: "POST",
                    body: JSON.stringify({
                      expiresInDays: 14,
                      requireAuthenticatedApproval: true,
                      workspaceId: selected.id,
                    }),
                  });
                  await refresh();
                  onMessage(
                    `Published and opened authenticated review ${link.url}`,
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Publish pinned version
            </button>
          </div>

          <div className="panel-section">
            <div className="library-label">Publications</div>
            {publications.length === 0 ? (
              <p className="quiet-note">No pinned publications yet.</p>
            ) : (
              <ul className="team-member-list">
                {publications.map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.name} · {p.kind}
                    </span>
                    <small>v{p.pinnedVersion}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel-section">
            <div className="library-label">Audit</div>
            {audit.length === 0 ? (
              <p className="quiet-note">No audit events yet.</p>
            ) : (
              <ul className="team-member-list">
                {audit.slice(0, 12).map((e) => (
                  <li key={e.id}>
                    <span>
                      {e.action}
                      {e.target ? ` · ${e.target.slice(0, 8)}` : ""}
                    </span>
                    <small>{new Date(e.at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
