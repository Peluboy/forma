import { useMemo, useState } from "react";
import { AppShell, Button, Notice, PageHeader } from "../../ui";
import { projectDesignSpecToFlowDocument } from "../../domain/design-spec/adapters/toFlowDocument.js";
import {
  describeSyncForUser,
  inspectProjectSync,
  resyncLinkedDesignSpec,
  syncProjectAfterEdit,
  validateProjectionLinks,
} from "../../domain/design-spec/sync";
import type { DesignSpec } from "../../domain/design-spec/types.js";
import {
  createInSyncState,
  getStoredDesignSpec,
} from "../../domain/design-spec/sync";

function sampleSpec(): DesignSpec {
  return {
    version: "1.0",
    id: "dev-sync-spec",
    name: "Sync lab",
    family: "document",
    copyPolicy: "exact",
    documentSize: { width: 612, height: 792, unit: "pt" },
    pages: [
      {
        id: "page-1",
        width: 612,
        height: 792,
        background: { color: "#f6f4ef" },
        elementIds: ["title"],
        elements: [
          {
            id: "title",
            type: "text",
            text: "Sync lab title",
            x: 48,
            y: 48,
            width: 480,
            height: 40,
            fontFamily: "Helvetica",
            fontSize: 22,
            sourceSpanIds: ["s1"],
          },
        ],
      },
    ],
  };
}

export default function SyncDevPanel() {
  const initial = useMemo(() => {
    const spec = sampleSpec();
    const { project } = projectDesignSpecToFlowDocument(spec, "Sync lab title");
    project.metadata = {
      designSpec: spec,
      designSpecSync: createInSyncState(spec.id, project.id),
    };
    return project;
  }, []);
  const [project, setProject] = useState(initial);
  const spec = getStoredDesignSpec(project);
  const sync = inspectProjectSync(project);
  const links =
    spec && project.flow ? validateProjectionLinks(spec, project.flow) : null;

  function editTitle() {
    const next = structuredClone(project);
    const frame = next.flow?.pages[0]?.elements[0];
    if (frame && frame.type === "text")
      frame.fontSize = (frame.fontSize || 22) + 2;
    setProject(syncProjectAfterEdit(project, next));
  }

  function addOrphan() {
    const next = structuredClone(project);
    next.flow?.pages[0]?.elements.push({
      id: `orphan-${Date.now()}`,
      type: "text",
      contentIds: [],
      x: 48,
      y: 120,
      width: 200,
      height: 24,
      fontSize: 12,
      fontFamily: "Arial",
      color: "#111",
      overflow: false,
    });
    setProject(syncProjectAfterEdit(project, next));
  }

  return (
    <AppShell
      activeNavId="dev-sync"
      currentScope={{
        type: "personal",
        name: "Developer",
        subName: "Sync lab",
      }}
    >
      <PageHeader
        title="Design sync lab"
        subtitle="Inspect whether the editable page and the native export file still match."
        breadcrumbs={[
          { label: "Developer", href: "/dev/sync" },
          { label: "Sync", current: true },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={editTitle}>
              Enlarge title
            </Button>
            <Button variant="secondary" onClick={addOrphan}>
              Add unlinked text
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                setProject(resyncLinkedDesignSpec(project).project)
              }
            >
              Resync
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2 px-6 pb-12 text-xs leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">State</h2>
          <Notice variant={sync.status === "in_sync" ? "success" : "warning"}>
            {describeSyncForUser(sync)}
          </Notice>
          <pre className="bg-bg-subtle border border-border rounded-lg p-3 overflow-auto max-h-80">
            {JSON.stringify(
              {
                sync,
                flowPages: project.flow?.pages.length,
                specPages: spec?.pages.length,
                links,
              },
              null,
              2,
            )}
          </pre>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Mapping</h2>
          <pre className="bg-bg-subtle border border-border rounded-lg p-3 overflow-auto max-h-[32rem]">
            {JSON.stringify(
              {
                pages: project.flow?.pages.map((page) => ({
                  id: page.id,
                  link: page.designLink,
                  elements: page.elements.map((element) => ({
                    id: element.id,
                    type: element.type,
                    link: element.designLink,
                  })),
                  decorations: (page.decorations || []).map((element) => ({
                    id: element.id,
                    type: element.type,
                    link: element.designLink,
                  })),
                })),
              },
              null,
              2,
            )}
          </pre>
        </section>
      </div>
    </AppShell>
  );
}
