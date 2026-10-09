import { useEffect, useState } from "react";
import { ArrowLeft, Building2, LayoutTemplate, Plus } from "lucide-react";
import { api, useAccount } from "../../shared/api/api";
import { Button } from "../../shared/components/ui/Button";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { PageMeta } from "../site/PublicSite";
import {
  createAgencyWorkspace,
  createPersonalWorkspace,
  LocalStorageClientStore,
  LocalStorageWorkspaceStore,
  type ClientRecord,
  type ClientStatus,
  type WorkspaceMemberRole,
  type WorkspaceRecord,
  type WorkspaceType,
} from "../../domain/workspace/index";
import {
  LocalStorageTemplateRecordStore,
  type TemplateFamilyRecord,
} from "../../domain/template-authoring/index";
import { readLocalProjects } from "../editor/hooks/usePersistence";
import type { Project } from "../../domain/design/model";
import { ClientDashboard } from "./ClientDashboard";
import { WorkspaceMembersTab } from "./WorkspaceMembersTab";
import { WorkspaceTemplatesTab } from "./WorkspaceTemplatesTab";

export default function WorkspacePage() {
  const { session, ready } = useAccount();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateFamilyRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<
    "clients" | "templates" | "members"
  >("clients");

  // Create Workspace Form State
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [newWsType, setNewWsType] = useState<WorkspaceType>("agency");

  // Create Client Form State
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientDesc, setNewClientDesc] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  const [error, setError] = useState("");

  const localWsStore = new LocalStorageWorkspaceStore();
  const localClientStore = new LocalStorageClientStore();
  const localTemplateStore = new LocalStorageTemplateRecordStore();

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) ||
    workspaces[0] ||
    null;

  const currentUserId = session.user?.id || "guest";
  const userMember = selectedWorkspace?.members.find(
    (m) => m.userId === currentUserId || (!session.user && m.role === "owner"),
  );
  const userRole: WorkspaceMemberRole =
    (userMember?.role as WorkspaceMemberRole) ||
    (selectedWorkspace?.ownerId === currentUserId ? "owner" : "viewer");

  async function loadData() {
    setError("");
    try {
      const localProjects = readLocalProjects();
      setProjects(localProjects);
      const localTemplates = localTemplateStore.list();
      setTemplates(localTemplates);

      if (!session.user) {
        // Guest mode: LocalStorage simulation
        let localWorkspaces = localWsStore.list();
        if (localWorkspaces.length === 0) {
          const defaultPersonal = createPersonalWorkspace({
            userId: "guest",
            name: "Guest User",
          });
          localWorkspaces = [defaultPersonal];
          localWsStore.save(defaultPersonal);
        }
        setWorkspaces(localWorkspaces);
        const wsId = selectedWorkspaceId || localWorkspaces[0]?.id || "";
        setSelectedWorkspaceId(wsId);
        if (wsId) {
          setClients(localClientStore.list(wsId));
        }
      } else {
        // Authenticated: load from backend or local fallback
        const r = await api<{
          workspaces: (WorkspaceRecord & { myRole?: string })[];
        }>("/workspaces").catch(() => null);

        if (r && Array.isArray(r.workspaces)) {
          setWorkspaces(r.workspaces);
          const wsId =
            selectedWorkspaceId &&
            r.workspaces.some((w) => w.id === selectedWorkspaceId)
              ? selectedWorkspaceId
              : r.workspaces[0]?.id || "";
          setSelectedWorkspaceId(wsId);
          if (wsId) {
            const clientRes = await api<{ clients: ClientRecord[] }>(
              `/workspaces/${encodeURIComponent(wsId)}/clients`,
            ).catch(() => ({ clients: [] }));
            setClients(clientRes.clients || []);
          }
        } else {
          // Fallback to local storage
          const localWorkspaces = localWsStore.list();
          setWorkspaces(localWorkspaces);
          if (localWorkspaces.length > 0) {
            const wsId = selectedWorkspaceId || localWorkspaces[0].id;
            setSelectedWorkspaceId(wsId);
            setClients(localClientStore.list(wsId));
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load workspace data");
    }
  }

  useEffect(() => {
    if (!ready) return;
    void loadData();
  }, [ready, session.user?.id]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    if (!session.user) {
      setClients(localClientStore.list(selectedWorkspaceId));
    } else {
      void api<{ clients: ClientRecord[] }>(
        `/workspaces/${encodeURIComponent(selectedWorkspaceId)}/clients`,
      )
        .then((res) => setClients(res.clients || []))
        .catch(() => setClients(localClientStore.list(selectedWorkspaceId)));
    }
  }, [selectedWorkspaceId, session.user?.id]);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const actor = {
        userId: currentUserId,
        email: session.user?.email,
        name: session.user?.name || "User",
      };
      if (!session.user) {
        const created = createAgencyWorkspace({
          name: newWsName.trim(),
          description: newWsDesc.trim(),
          type: newWsType,
          owner: actor,
        });
        localWsStore.save(created);
        setWorkspaces(localWsStore.list());
        setSelectedWorkspaceId(created.id);
      } else {
        const res = await api<{ workspace: WorkspaceRecord }>("/workspaces", {
          method: "POST",
          body: JSON.stringify({
            name: newWsName.trim(),
            description: newWsDesc.trim(),
            type: newWsType,
          }),
        });
        await loadData();
        setSelectedWorkspaceId(res.workspace.id);
      }
      setShowCreateWs(false);
      setNewWsName("");
      setNewWsDesc("");
    } catch (err: any) {
      setError(err?.message || "Could not create workspace");
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName.trim() || !selectedWorkspaceId) return;
    try {
      const clientPayload = {
        workspaceId: selectedWorkspaceId,
        name: newClientName.trim(),
        description: newClientDesc.trim(),
        notes: newClientNotes.trim(),
        status: "active" as const,
        brandIds: [],
        templateFamilyRecordIds: [],
        projectIds: [],
      };

      if (!session.user) {
        const created = localClientStore.save({
          id: `cli-${crypto.randomUUID()}`,
          version: "1.0",
          ...clientPayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setClients(localClientStore.list(selectedWorkspaceId));
        setSelectedClientId(created.id);
      } else {
        const res = await api<{ client: ClientRecord }>(
          `/workspaces/${encodeURIComponent(selectedWorkspaceId)}/clients`,
          {
            method: "POST",
            body: JSON.stringify(clientPayload),
          },
        );
        setClients((prev) => [res.client, ...prev]);
        setSelectedClientId(res.client.id);
      }
      setShowCreateClient(false);
      setNewClientName("");
      setNewClientDesc("");
      setNewClientNotes("");
    } catch (err: any) {
      setError(err?.message || "Could not create client");
    }
  }

  async function handleArchiveClient(client: ClientRecord) {
    const nextStatus: ClientStatus =
      client.status === "active" ? "archived" : "active";
    try {
      if (!session.user) {
        const updated = {
          ...client,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
        localClientStore.save(updated);
        setClients(localClientStore.list(client.workspaceId));
      } else {
        const res = await api<{ client: ClientRecord }>(
          nextStatus === "archived"
            ? `/clients/${encodeURIComponent(client.id)}/archive`
            : `/clients/${encodeURIComponent(client.id)}`,
          {
            method: nextStatus === "archived" ? "POST" : "PUT",
            body:
              nextStatus === "archived"
                ? undefined
                : JSON.stringify({ status: "active" }),
          },
        );
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? res.client : c)),
        );
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update client status");
    }
  }

  async function handleAssignTemplate(templateId: string, clientId?: string) {
    try {
      const template = localTemplateStore.get(templateId);
      if (!template) return;
      const updated: TemplateFamilyRecord = {
        ...template,
        workspaceId: selectedWorkspaceId,
        clientId: clientId || undefined,
        updatedAt: new Date().toISOString(),
      };
      localTemplateStore.save(updated);
      setTemplates(localTemplateStore.list());
    } catch (err: any) {
      setError(err?.message || "Failed to assign template");
    }
  }

  async function handleInviteMember(email: string, role: WorkspaceMemberRole) {
    if (!selectedWorkspaceId) return;
    if (!session.user) {
      const ws = localWsStore.get(selectedWorkspaceId);
      if (!ws) return;
      const updatedWs: WorkspaceRecord = {
        ...ws,
        members: [
          ...ws.members,
          {
            userId: `mock-${email.split("@")[0]}`,
            email,
            role,
            status: "invited",
            invitedAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      localWsStore.save(updatedWs);
      setWorkspaces(localWsStore.list());
    } else {
      await api(
        `/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      );
      await loadData();
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedWorkspaceId) return;
    if (!session.user) {
      const ws = localWsStore.get(selectedWorkspaceId);
      if (!ws) return;
      const updatedWs: WorkspaceRecord = {
        ...ws,
        members: ws.members.filter((m) => m.userId !== userId),
        updatedAt: new Date().toISOString(),
      };
      localWsStore.save(updatedWs);
      setWorkspaces(localWsStore.list());
    } else {
      await api(
        `/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      await loadData();
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <div className="min-h-dvh bg-bg-page text-text-primary font-[var(--font-ui)]">
      <PageMeta title="Agency Workspaces" privatePage />

      {/* Header */}
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-bg-panel px-5 md:px-8">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary no-underline hover:text-accent transition-colors"
          >
            <ArrowLeft size={17} /> Dashboard
          </a>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 size={16} className="text-accent" />
            <span>Workspaces & Clients</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle compact />
        </div>
      </header>

      <main className="max-w-[1300px] mx-auto px-4 py-8 md:px-8 space-y-8">
        {error && (
          <div className="p-3 rounded-md bg-rose-500/10 text-rose-500 text-xs border border-rose-500/20">
            {error}
          </div>
        )}

        {/* Workspace Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-bg-panel">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Workspace:
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => {
                setSelectedWorkspaceId(e.target.value);
                setSelectedClientId(null);
              }}
              className="px-3 py-1.5 text-sm font-semibold rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type})
                </option>
              ))}
            </select>
            {selectedWorkspace && (
              <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-bg-elevated text-text-secondary border border-border">
                Role: {userRole}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCreateWs(!showCreateWs)}
          >
            <Plus size={14} className="mr-1.5" /> New Workspace
          </Button>
        </div>

        {/* Create Workspace Collapsible Form */}
        {showCreateWs && (
          <form
            onSubmit={handleCreateWorkspace}
            className="p-5 rounded-xl border border-border bg-bg-panel space-y-4 max-w-xl"
          >
            <h3 className="text-sm font-bold text-text-primary">
              Create Workspace
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Apex Creative Agency"
                  className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={newWsType}
                  onChange={(e) =>
                    setNewWsType(e.target.value as WorkspaceType)
                  }
                  className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                >
                  <option value="agency">
                    Agency (Multi-client, team collaboration)
                  </option>
                  <option value="team">Team (Single company team)</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="Brand consistency and production studio"
                  className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateWs(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* If a client is selected, render ClientDashboard */}
        {selectedClient && selectedWorkspace ? (
          <ClientDashboard
            workspace={selectedWorkspace}
            client={selectedClient}
            templates={templates}
            projects={projects}
            onBack={() => setSelectedClientId(null)}
            onArchiveToggle={handleArchiveClient}
            onRefresh={loadData}
            userRole={userRole}
          />
        ) : selectedWorkspace ? (
          /* Workspace Main View */
          <div className="space-y-6">
            {/* Workspace Tabs */}
            <div className="flex gap-6 border-b border-border text-sm font-medium">
              <button
                onClick={() => setActiveTab("clients")}
                className={`pb-2.5 transition-colors border-b-2 ${
                  activeTab === "clients"
                    ? "border-accent text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                Clients ({clients.length})
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`pb-2.5 transition-colors border-b-2 ${
                  activeTab === "templates"
                    ? "border-accent text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                Template Library
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`pb-2.5 transition-colors border-b-2 ${
                  activeTab === "members"
                    ? "border-accent text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                Team Members ({selectedWorkspace.members.length})
              </button>
            </div>

            {/* TAB: CLIENTS */}
            {activeTab === "clients" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      Agency Clients
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Organize designs, brands, and templates by client
                      accounts.
                    </p>
                  </div>
                  {(userRole === "owner" || userRole === "admin") && (
                    <Button
                      size="sm"
                      onClick={() => setShowCreateClient(!showCreateClient)}
                    >
                      <Plus size={14} className="mr-1.5" /> Add Client
                    </Button>
                  )}
                </div>

                {/* Add Client Collapsible Form */}
                {showCreateClient && (
                  <form
                    onSubmit={handleCreateClient}
                    className="p-5 rounded-xl border border-border bg-bg-panel space-y-4 max-w-xl"
                  >
                    <h4 className="text-sm font-bold text-text-primary">
                      Add New Client under {selectedWorkspace.name}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Acme Health & Fitness"
                          className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Description / Industry
                        </label>
                        <input
                          type="text"
                          value={newClientDesc}
                          onChange={(e) => setNewClientDesc(e.target.value)}
                          placeholder="Corporate wellness & publications"
                          className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Brand Guidelines & Notes
                        </label>
                        <textarea
                          value={newClientNotes}
                          onChange={(e) => setNewClientNotes(e.target.value)}
                          placeholder="Headline style: Space Grotesk Bold, exact legal disclaimer required on footer."
                          rows={3}
                          className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Create Client
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateClient(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {/* Client Grid */}
                {clients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-text-secondary space-y-3">
                    <Building2 size={32} className="mx-auto opacity-50" />
                    <p className="font-medium text-text-primary">
                      No clients added yet
                    </p>
                    <p className="max-w-md mx-auto text-xs">
                      Clients allow you to scope templates, projects, and brand
                      assets to specific client accounts.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {clients.map((client) => {
                      const clientProjectCount = projects.filter(
                        (p) => p.clientId === client.id,
                      ).length;
                      const clientTemplateCount = templates.filter(
                        (t) => t.clientId === client.id,
                      ).length;

                      return (
                        <div
                          key={client.id}
                          className="p-5 rounded-xl border border-border bg-bg-panel flex flex-col justify-between hover:border-accent/40 transition-colors shadow-xs"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  client.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {client.status}
                              </span>
                              <span className="text-xs text-text-secondary font-medium">
                                {clientProjectCount}{" "}
                                {clientProjectCount === 1
                                  ? "project"
                                  : "projects"}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-base text-text-primary">
                                {client.name}
                              </h4>
                              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                                {client.description ||
                                  "No description provided."}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-text-secondary pt-1">
                              <LayoutTemplate size={13} />
                              <span>{clientTemplateCount} templates</span>
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                            <button
                              onClick={() => setSelectedClientId(client.id)}
                              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                            >
                              Client Dashboard &rarr;
                            </button>
                            <a
                              href={`/create?workspace=${encodeURIComponent(selectedWorkspace.id)}&client=${encodeURIComponent(client.id)}`}
                              className="text-xs font-semibold px-2.5 py-1 rounded bg-bg-elevated hover:bg-accent hover:text-accent-contrast transition-colors"
                            >
                              + Design
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: TEMPLATES */}
            {activeTab === "templates" && (
              <WorkspaceTemplatesTab
                workspace={selectedWorkspace}
                clients={clients}
                templates={templates}
                onAssignTemplate={handleAssignTemplate}
                userRole={userRole}
              />
            )}

            {/* TAB: MEMBERS */}
            {activeTab === "members" && (
              <WorkspaceMembersTab
                workspace={selectedWorkspace}
                onInviteMember={handleInviteMember}
                onRemoveMember={handleRemoveMember}
                userRole={userRole}
                currentUserId={currentUserId}
              />
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
