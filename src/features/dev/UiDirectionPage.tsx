import { useState } from "react";
import {
  FileImage,
  FileText,
  LayoutGrid,
  LayoutTemplate,
  Presentation,
  Sparkles,
  Type,
} from "lucide-react";
import {
  ActionCard,
  AppShell,
  Button,
  ChoiceCard,
  ClientCard,
  DropZone,
  EditorToolButton,
  EmptyProjectIllustration,
  GraphicDocumentIllustration,
  HeroPanel,
  IllustrationPanel,
  InspectorPanel,
  InspectorSection,
  LinkButton,
  ProjectCard,
  ReportDocumentIllustration,
  SearchInput,
  SegmentedControl,
  SlideDocumentIllustration,
  StatusBadge,
  Stepper,
  TemplateCard,
  TextArea,
  WorkspaceCard,
  WorkspaceRoleBadge,
} from "../../ui";

const STEPS = [
  { id: "words", label: "Words" },
  { id: "style", label: "Style" },
  { id: "review", label: "Review" },
];

export default function UiDirectionPage() {
  const [scope, setScope] = useState<"all" | "personal" | "workspace">("all");
  const [kind, setKind] = useState("document");
  const [section, setSection] = useState("landing");

  return (
    <div className="min-h-dvh bg-bg-page text-text-primary">
      <header className="sticky top-0 z-20 border-b border-border bg-bg-panel/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <div>
            <strong className="forma-display text-lg">Forma direction</strong>
            <p className="m-0 text-xs text-text-tertiary">
              High-fidelity proof. Not wired to live data.
            </p>
          </div>
          <SegmentedControl
            label="Screen"
            size="sm"
            value={section}
            onChange={setSection}
            options={[
              { value: "landing", label: "Landing" },
              { value: "dashboard", label: "Dashboard" },
              { value: "create", label: "Create" },
              { value: "editor", label: "Editor" },
              { value: "workspace", label: "Workspace" },
              { value: "gallery", label: "Gallery" },
            ]}
          />
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] space-y-10 px-6 py-8">
        {section === "landing" && <LandingProof />}
        {section === "dashboard" && (
          <DashboardProof scope={scope} onScope={setScope} />
        )}
        {section === "create" && <CreateProof kind={kind} onKind={setKind} />}
        {section === "editor" && <EditorProof />}
        {section === "workspace" && <WorkspaceProof />}
        {section === "gallery" && <GalleryProof />}
      </div>
    </div>
  );
}

function LandingProof() {
  return (
    <HeroPanel
      scene="hero"
      kicker="Your words. Beautifully in place."
      title={
        <>
          A design you love.
          <br />
          The words only you can say.
        </>
      }
      subtitle="Bring a reference. Bring your manuscript. Make them work together without losing a word."
      actions={
        <>
          <LinkButton href="/create" variant="primary" size="lg">
            Create with AI
          </LinkButton>
          <LinkButton href="/" variant="secondary" size="lg">
            See the product
          </LinkButton>
        </>
      }
      art={<ReportDocumentIllustration size={200} />}
    />
  );
}

function DashboardProof({
  scope,
  onScope,
}: {
  scope: "all" | "personal" | "workspace";
  onScope: (value: "all" | "personal" | "workspace") => void;
}) {
  return (
    <AppShell
      activeNavId="designs"
      userName="Maya Chen"
      currentScope={{
        type: "personal",
        name: "Maya Chen",
        subName: "Personal",
      }}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-8">
        <HeroPanel
          kicker="Your studio"
          title="Good morning, Maya"
          subtitle="Start with your words. Pick a style. Review the pages."
          actions={
            <LinkButton
              href="/create"
              variant="primary"
              size="lg"
              iconLeft={<Sparkles size={16} />}
            >
              Create design
            </LinkButton>
          }
          art={<SlideDocumentIllustration size={180} />}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            tone="feature"
            title="Create with AI"
            description="Paste a manuscript. Get pages."
            href="/create"
            icon={<Sparkles size={18} />}
          />
          <ActionCard
            title="Use a template"
            description="Start with a ready layout"
            href="/templates"
            icon={<LayoutTemplate size={18} />}
          />
          <ActionCard
            title="Use a reference"
            description="Upload a design to adapt"
            href="/create"
            icon={<FileImage size={18} />}
            art={<GraphicDocumentIllustration size={110} />}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="forma-display m-0 text-[20px]">Recent designs</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              label="Search designs"
              value=""
              onChange={() => undefined}
              className="w-[200px]"
            />
            <SegmentedControl
              label="Scope"
              size="sm"
              value={scope}
              onChange={onScope}
              options={[
                { value: "all", label: "All" },
                { value: "personal", label: "Personal" },
                { value: "workspace", label: "Workspace" },
              ]}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCard
            id="1"
            name="Bloom Q3 report"
            family="document"
            templateName="Editorial"
            updatedAt={new Date().toISOString()}
            clientName="Bloom Health"
            preview={<ReportDocumentIllustration size={140} />}
            onOpen={() => undefined}
          />
          <ProjectCard
            id="2"
            name="Studio pitch"
            family="presentation"
            templateName="Deck"
            updatedAt={new Date().toISOString()}
            preview={<SlideDocumentIllustration size={140} />}
            onOpen={() => undefined}
          />
          <ProjectCard
            id="3"
            name="Summer event"
            family="graphics"
            templateName="Flyer"
            updatedAt={new Date().toISOString()}
            preview={<GraphicDocumentIllustration size={140} />}
            onOpen={() => undefined}
          />
        </div>
      </div>
    </AppShell>
  );
}

function CreateProof({
  kind,
  onKind,
}: {
  kind: string;
  onKind: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-bg-panel shadow-[var(--shadow-sm)]">
      <div className="border-b border-border px-8 py-5">
        <Stepper steps={STEPS} currentStepIndex={0} />
      </div>
      <div className="grid gap-8 p-8 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="forma-display m-0 text-[32px]">
              Start with your words.
            </h1>
            <p className="mt-2 mb-0 text-[13px] text-text-secondary">
              Saved to Bloom Health in Acme Studio.
            </p>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-[13px] font-semibold">
              What are you making?
            </legend>
            <div className="grid gap-2">
              <ChoiceCard
                name="kind"
                value="document"
                checked={kind === "document"}
                onChange={() => onKind("document")}
                title="Report"
                description="Multi-page branded document"
                icon={<FileText size={14} />}
              />
              <ChoiceCard
                name="kind"
                value="slides"
                checked={kind === "slides"}
                onChange={() => onKind("slides")}
                title="Presentation"
                description="Pitches and decks"
                icon={<Presentation size={14} />}
              />
              <ChoiceCard
                name="kind"
                value="graphic"
                checked={kind === "graphic"}
                onChange={() => onKind("graphic")}
                title="Graphic"
                description="Flyers and social"
                icon={<LayoutGrid size={14} />}
              />
            </div>
          </fieldset>
          <TextArea
            label="Your manuscript"
            placeholder="Paste the exact words to include"
            rows={6}
            defaultValue=""
          />
          <DropZone
            title="Or upload a file"
            hint="TXT, DOCX, Markdown, or PDF"
            onFile={() => undefined}
          />
          <Button variant="primary" fullWidth iconLeft={<Sparkles size={16} />}>
            Create design
          </Button>
        </div>
        <IllustrationPanel
          scene="create"
          title="Pages will appear here"
          description="Add your words, pick a style, then review the pages."
          art={<EmptyProjectIllustration size={88} />}
        />
      </div>
    </div>
  );
}

function EditorProof() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-bg-panel shadow-[var(--shadow-md)]">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <strong className="forma-display text-[15px]">Bloom Q3 report</strong>
        <StatusBadge label="Ready" variant="success" />
      </div>
      <div className="flex min-h-[480px]">
        <nav className="flex w-[76px] flex-col items-center gap-1 border-r border-border py-3">
          <EditorToolButton
            label="Design"
            selected
            icon={<LayoutGrid size={18} />}
          />
          <EditorToolButton label="Text" icon={<Type size={18} />} />
          <EditorToolButton label="Content" icon={<FileText size={18} />} />
        </nav>
        <div className="forma-dot-grid min-w-0 flex-1 p-8">
          <div className="mx-auto grid h-full max-w-[420px] place-items-center rounded-xl bg-bg-panel shadow-[var(--shadow-lg)]">
            <ReportDocumentIllustration size={220} />
          </div>
        </div>
        <InspectorPanel title="Content">
          <InspectorSection title="Fields">
            <TextArea label="Headline" rows={2} defaultValue="Q3 results" />
            <TextArea label="Body" rows={4} defaultValue="Members grew 18%." />
          </InspectorSection>
          <InspectorSection title="Checks">
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Copy checked" variant="success" />
              <StatusBadge label="Fits page" variant="success" />
            </div>
          </InspectorSection>
        </InspectorPanel>
      </div>
    </div>
  );
}

function WorkspaceProof() {
  return (
    <div className="flex flex-col gap-6">
      <HeroPanel
        scene="workspace"
        kicker="Acme Studio"
        title="Clients"
        subtitle="Brand, templates, and projects for each account."
        actions={<Button variant="primary">New client</Button>}
        art={<WorkspaceRoleBadge role="owner" />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClientCard
          id="1"
          name="Bloom Health"
          description="Wellness publications"
          status="active"
          projectCount={12}
          templateCount={4}
          onOpen={() => undefined}
          onCreateProject={() => undefined}
        />
        <ClientCard
          id="2"
          name="Northline"
          status="active"
          projectCount={3}
          templateCount={1}
          onOpen={() => undefined}
        />
        <WorkspaceCard
          id="ws"
          name="Acme Studio"
          type="agency"
          memberCount={8}
          clientCount={6}
          onOpen={() => undefined}
        />
      </div>
    </div>
  );
}

function GalleryProof() {
  return (
    <div className="flex flex-col gap-6">
      <HeroPanel
        scene="gallery"
        kicker="Templates"
        title="A starting point. Then yours."
        subtitle="Approved layouts you can use with your own copy."
        art={<LayoutTemplate size={72} className="text-accent" />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TemplateCard
          id="1"
          name="Editorial report"
          description="Cover, metrics, and close"
          layoutCount={6}
          status="approved"
          onUse={() => undefined}
        />
        <TemplateCard
          id="2"
          name="Pitch deck"
          layoutCount={8}
          status="approved"
          onUse={() => undefined}
        />
        <TemplateCard
          id="3"
          name="Event flyer"
          layoutCount={1}
          status="approved"
          onUse={() => undefined}
        />
      </div>
    </div>
  );
}
