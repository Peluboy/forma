import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, useAccount } from "../../shared/api/api";
import { PageMeta } from "../site/PublicSite";
import {
  AppShell,
  Button,
  EmptyState,
  EmptyWorkspaceIllustration,
  Input,
  Modal,
  Select,
  Tabs,
  TextArea,
  WorkspaceRoleBadge,
  ClientCard,
} from "../../ui";
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
    <AppShell
      activeNavId="workspaces"
      contentWidth="wide"
      userName={session.user?.name}
      guest={!session.user}
      currentScope={{
        type: selectedWorkspace ? "workspace" : "personal",
        name: selectedWorkspace?.name || "Workspaces",
        subName: selectedClient?.name || "Clients",
      }}
      trail={
        selectedWorkspace
          ? `${selectedWorkspace.name}${selectedClient ? ` / ${selectedClient.name}` : ""}`
          : "Workspaces"
      }
    >
      <PageMeta title="Workspaces" privatePage />
      <div className="flex flex-col gap-6">
        {error && (
          <div
            className="rounded-2xl bg-danger-muted px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {workspaces.length > 0 && (
              <Select
                label="Workspace"
                value={selectedWorkspaceId}
                onChange={(e) => {
                  setSelectedWorkspaceId(e.target.value);
                  setSelectedClientId(null);
                }}
                fullWidth={false}
                className="min-w-[200px]"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            )}
            {selectedWorkspace && <WorkspaceRoleBadge role={userRole} />}
          </div>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Plus size={14} />}
            onClick={() => setShowCreateWs(true)}
          >
            New workspace
          </Button>
        </div>

        <Modal
          open={showCreateWs}
          onClose={() => setShowCreateWs(false)}
          title="New workspace"
        >
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <Input
              label="Name"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Apex Studio"
              required
            />
            <Select
              label="Type"
              value={newWsType}
              onChange={(e) => setNewWsType(e.target.value as WorkspaceType)}
            >
              <option value="agency">Agency</option>
              <option value="team">Team</option>
              <option value="personal">Personal</option>
            </Select>
            <Input
              label="Description"
              value={newWsDesc}
              onChange={(e) => setNewWsDesc(e.target.value)}
              placeholder="Optional"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateWs(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showCreateClient}
          onClose={() => setShowCreateClient(false)}
          title="New client"
          description={
            selectedWorkspace ? `Saved to ${selectedWorkspace.name}` : undefined
          }
        >
          <form onSubmit={handleCreateClient} className="space-y-4">
            <Input
              label="Name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Bloom Health"
              required
            />
            <Input
              label="Industry"
              value={newClientDesc}
              onChange={(e) => setNewClientDesc(e.target.value)}
              placeholder="Optional"
            />
            <TextArea
              label="Notes"
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateClient(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add client
              </Button>
            </div>
          </form>
        </Modal>

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
          <div className="flex flex-col gap-6">
            <Tabs
              activeId={activeTab}
              onChange={(id) =>
                setActiveTab(id as "clients" | "templates" | "members")
              }
              items={[
                { id: "clients", label: "Clients", badge: clients.length },
                { id: "templates", label: "Templates" },
                {
                  id: "members",
                  label: "Members",
                  badge: selectedWorkspace.members.length,
                },
              ]}
            />

            {activeTab === "clients" && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="forma-display m-0 text-[20px]">Clients</h2>
                  {(userRole === "owner" || userRole === "admin") && (
                    <Button
                      size="sm"
                      iconLeft={<Plus size={14} />}
                      onClick={() => setShowCreateClient(true)}
                    >
                      New client
                    </Button>
                  )}
                </div>
                {clients.length === 0 ? (
                  <EmptyState
                    illustration={<EmptyWorkspaceIllustration size={88} />}
                    title="Add your first client"
                    description="Keep brand, templates, and projects together."
                    action={
                      userRole === "owner" || userRole === "admin"
                        ? {
                            label: "New client",
                            onClick: () => setShowCreateClient(true),
                            icon: <Plus size={14} />,
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {clients.map((client) => (
                      <ClientCard
                        key={client.id}
                        id={client.id}
                        name={client.name}
                        description={client.description}
                        status={client.status}
                        projectCount={
                          projects.filter((p) => p.clientId === client.id)
                            .length
                        }
                        templateCount={
                          templates.filter((t) => t.clientId === client.id)
                            .length
                        }
                        onOpen={() => setSelectedClientId(client.id)}
                        onCreateProject={() =>
                          location.assign(
                            `/create?workspace=${encodeURIComponent(selectedWorkspace.id)}&client=${encodeURIComponent(client.id)}`,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "templates" && (
              <WorkspaceTemplatesTab
                workspace={selectedWorkspace}
                clients={clients}
                templates={templates}
                onAssignTemplate={handleAssignTemplate}
                userRole={userRole}
              />
            )}

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
        ) : (
          <EmptyState
            illustration={<EmptyWorkspaceIllustration size={88} />}
            title="Set up your studio"
            description="Create a workspace to manage clients and team."
            action={{
              label: "New workspace",
              onClick: () => setShowCreateWs(true),
              icon: <Plus size={14} />,
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
