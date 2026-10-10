import { useState } from "react";
import {
  AppShell,
  PageHeader,
  SectionHeader,
  PageGrid,
  Button,
  IconButton,
  Input,
  Select,
  TextArea,
  Toggle,
  Badge,
  Card,
  MetricCard,
  Stepper,
  Tabs,
  Modal,
  Notice,
  Progress,
  EmptyState,
  LoadingState,
  ErrorState,
  TrustStatus,
  CopyCheckBadge,
  FitCheckBadge,
  TemplateStatusBadge,
  WorkspaceRoleBadge,
  ProjectCard,
  TemplateCard,
  ReferenceCard,
  ClientCard,
  WorkspaceCard,
  FormaGradientMesh,
  ReportDocumentIllustration,
  SlideDocumentIllustration,
  GraphicDocumentIllustration,
  EmptyProjectIllustration,
} from "../../ui";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Settings,
  Layers,
} from "lucide-react";

export default function UiPlaygroundPage() {
  const [activeTab, setActiveTab] = useState("primitives");
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleVal, setToggleVal] = useState(true);
  const [progressVal, setProgressVal] = useState(65);

  const steps = [
    { id: "1", label: "Document" },
    { id: "2", label: "Content" },
    { id: "3", label: "Style" },
    { id: "4", label: "Review" },
  ];

  return (
    <AppShell
      activeNavId="ui-playground"
      currentScope={{
        type: "workspace",
        name: "Forma UI System",
        subName: "Design System Playground",
      }}
    >
      <PageHeader
        title="Forma UI Playground"
        subtitle="A centralized showcase of reusable tokens, layout primitives, cards, and status systems across the product."
        breadcrumbs={[
          { label: "Developer", href: "/dev/ui" },
          { label: "UI Playground", current: true },
        ]}
        actions={
          <Button
            variant="primary"
            iconLeft={<Sparkles size={16} />}
            onClick={() => setModalOpen(true)}
          >
            Open sample modal
          </Button>
        }
      />

      <div className="my-6">
        <Tabs
          items={[
            { id: "primitives", label: "Buttons & Inputs" },
            { id: "status", label: "Status & Badges" },
            { id: "cards", label: "Cards & Grids" },
            { id: "art", label: "Art & States" },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === "primitives" && (
        <div className="flex flex-col gap-8">
          {/* Buttons */}
          <Card padding="lg">
            <SectionHeader title="Buttons & Variants" />
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="primary" iconLeft={<Sparkles size={15} />}>
                Primary Action
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger" iconLeft={<Trash2 size={15} />}>
                Danger
              </Button>
              <Button variant="primary" loading>
                Loading
              </Button>
              <Button variant="secondary" size="sm">
                Small button
              </Button>
              <Button
                variant="primary"
                size="lg"
                iconRight={<ArrowRight size={16} />}
              >
                Large button
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <IconButton label="Settings" variant="secondary">
                <Settings size={16} />
              </IconButton>
              <IconButton label="Add" variant="primary">
                <Plus size={16} />
              </IconButton>
              <IconButton label="Delete" variant="danger">
                <Trash2 size={16} />
              </IconButton>
            </div>
          </Card>

          {/* Form Controls */}
          <Card padding="lg">
            <SectionHeader title="Form Controls" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <Input
                label="Project name"
                placeholder="Q4 Growth Strategy"
                hint="Max 60 chars"
              />
              <Select
                label="Format"
                options={[
                  { value: "report", label: "Multi-page Report" },
                  { value: "slides", label: "Presentation Deck" },
                  { value: "flyer", label: "Single-page Flyer" },
                ]}
              />
              <div className="md:col-span-2">
                <TextArea
                  label="Manuscript content"
                  placeholder="Paste report text here..."
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 pt-2">
                <Toggle
                  label="Allow client template sharing"
                  description="Client members can fork approved workspace templates."
                  checked={toggleVal}
                  onChange={setToggleVal}
                />
              </div>
            </div>
          </Card>

          {/* Stepper & Progress */}
          <Card padding="lg">
            <SectionHeader title="Progress & Stepper" />
            <div className="flex flex-col gap-6 max-w-xl">
              <Stepper steps={steps} currentStepIndex={2} />
              <Progress
                value={progressVal}
                label="Generation progress"
                showPercent
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setProgressVal(Math.max(0, progressVal - 15))}
                >
                  -15%
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setProgressVal(Math.min(100, progressVal + 15))
                  }
                >
                  +15%
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "status" && (
        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <SectionHeader title="Status Language & Quality Badges" />
            <p className="text-xs text-text-secondary mb-4">
              Deterministic status badges map internal scores into plain English
              labels (no technical jargon, no em dashes).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrustStatus score={96} fidelity="trusted" />
              <TrustStatus score={78} fidelity="trusted" />
              <TrustStatus score={62} fidelity="trusted" />
              <TrustStatus score={90} fidelity="loss_detected" />
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <CopyCheckBadge valid={true} />
              <CopyCheckBadge valid={false} />
              <FitCheckBadge valid={true} />
              <FitCheckBadge valid={false} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <TemplateStatusBadge status="approved" />
              <TemplateStatusBadge status="draft" />
              <TemplateStatusBadge status="candidate" />
              <TemplateStatusBadge status="needs_changes" />
              <TemplateStatusBadge status="rejected" />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <WorkspaceRoleBadge role="owner" />
              <WorkspaceRoleBadge role="admin" />
              <WorkspaceRoleBadge role="designer" />
              <WorkspaceRoleBadge role="viewer" />
            </div>
          </Card>

          <Card padding="lg">
            <SectionHeader title="Notices" />
            <div className="flex flex-col gap-3 max-w-xl">
              <Notice variant="success" title="Design saved">
                Your document is ready for export or editing.
              </Notice>
              <Notice variant="warning" title="Minor limits applied">
                Heading size was slightly scaled to fit available height.
              </Notice>
              <Notice variant="danger" title="Storage full">
                Browser storage quota exceeded. Export older projects to make
                space.
              </Notice>
              <Notice variant="info">
                Templates assigned to clients are prioritized in their creation
                flow.
              </Notice>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "cards" && (
        <div className="flex flex-col gap-8">
          <div>
            <SectionHeader title="Metrics" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Active Projects"
                value="24"
                change="+12% this week"
                changeType="positive"
                icon={<Layers size={18} />}
              />
              <MetricCard
                label="Approved Templates"
                value="6"
                change="1 candidate ready"
                changeType="neutral"
                icon={<Sparkles size={18} />}
              />
              <MetricCard
                label="Quality Score"
                value="95%"
                change="+3.2 pts"
                changeType="positive"
              />
              <MetricCard
                label="Team Members"
                value="8"
                change="2 invited"
                changeType="neutral"
              />
            </div>
          </div>

          <div>
            <SectionHeader title="Project Cards" />
            <PageGrid minWidth={280}>
              <ProjectCard
                id="p1"
                name="2026 Strategic Plan"
                templateName="Editorial Report"
                workspaceName="Acme Agency"
                clientName="Bloom Health"
                qualityScore={96}
                onOpen={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
              />
              <ProjectCard
                id="p2"
                name="Brand Identity Guidelines"
                templateName="Minimal Deck"
                qualityScore={84}
                onOpen={() => {}}
                onDuplicate={() => {}}
              />
              <ProjectCard
                id="p3"
                name="Executive Overview"
                templateName="Executive Brief"
                workspaceName="Acme Agency"
                qualityScore={90}
                onOpen={() => {}}
              />
            </PageGrid>
          </div>

          <div>
            <SectionHeader title="Template & Reference Cards" />
            <PageGrid minWidth={280}>
              <TemplateCard
                id="t1"
                name="Forma Editorial Report"
                description="Structured multi-page report with cover, metrics, two-column layouts, and conclusion."
                layoutCount={7}
                status="approved"
                source="built-in"
                onUse={() => {}}
              />
              <ReferenceCard
                id="r1"
                name="Monochrome Modern"
                confidence="ready"
                palette={["#17201d", "#126d5f", "#8ae0bf", "#f0f1ee"]}
                fonts={["Manrope", "Plus Jakarta Sans"]}
                onUse={() => {}}
              />
              <ClientCard
                id="c1"
                name="Bloom Health"
                description="Healthcare technology solutions for modern wellness providers."
                status="active"
                projectCount={5}
                templateCount={2}
                onOpen={() => {}}
                onCreateProject={() => {}}
              />
              <WorkspaceCard
                id="w1"
                name="Acme Creative"
                type="agency"
                memberCount={5}
                clientCount={3}
                onOpen={() => {}}
              />
            </PageGrid>
          </div>
        </div>
      )}

      {activeTab === "art" && (
        <div className="flex flex-col gap-8">
          <Card padding="lg">
            <SectionHeader title="Forma Art & Document Illustrations" />
            <div className="flex items-center gap-8 flex-wrap justify-around p-4 bg-[var(--bg-muted)]/50 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <ReportDocumentIllustration size={100} />
                <span className="text-xs font-medium text-text-secondary">
                  Report Document
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <SlideDocumentIllustration size={100} />
                <span className="text-xs font-medium text-text-secondary">
                  Slide Deck
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <GraphicDocumentIllustration size={100} />
                <span className="text-xs font-medium text-text-secondary">
                  Graphic / Flyer
                </span>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <SectionHeader title="Empty, Loading & Error States" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EmptyState
                illustration={<EmptyProjectIllustration size={80} />}
                title="No projects yet"
                description="Bring your manuscript or start with an approved layout to create your first design."
                action={{ label: "Create design", onClick: () => {} }}
              />

              <div className="rounded-2xl border border-border bg-[var(--bg-panel)] p-4 flex items-center justify-center">
                <LoadingState
                  message="Generating document..."
                  subMessage="Evaluating exact copy and fit"
                />
              </div>

              <div className="flex items-center justify-center">
                <ErrorState
                  title="Document cannot be fitted"
                  description="Text is too long for this page layout without reducing readability."
                  technicalDetails="FitEngine: overflow detected on slot body_1 (delta +48px)"
                  onRetry={() => {}}
                />
              </div>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <FormaGradientMesh intensity="medium" className="p-8">
              <div className="max-w-md">
                <Badge variant="accent" size="sm" className="mb-2">
                  Visual Art Direction
                </Badge>
                <h3 className="text-xl font-bold text-text-primary m-0">
                  Creative Studio Canvas
                </h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed m-0">
                  Subtle mesh artwork provides depth, calm contrast, and
                  elegance without decorative clutter.
                </p>
              </div>
            </FormaGradientMesh>
          </Card>
        </div>
      )}

      {/* Sample Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Modal Dialog"
        description="A reusable modal primitive using HTML5 dialog and smooth animations."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary m-0">
            This modal replaces ad-hoc absolute overlays and conforms to
            accessible dialog semantics.
          </p>
          <Input label="Name" defaultValue="Design Review Q4" />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
