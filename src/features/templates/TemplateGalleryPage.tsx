import { useEffect, useMemo, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { api, post, useAccount } from "../../shared/api/api";
import {
  AppShell,
  EmptyState,
  FilterBar,
  FilterChip,
  HeroPanel,
  SearchInput,
  TemplateCard,
} from "../../ui";
import {
  listPublicGallery,
  sanitizeTemplateForPublicView,
  templateGalleryCard,
} from "../../domain/template-sharing/index.js";
import { LocalStorageTemplateRecordStore } from "../../domain/template-authoring/index.js";

type GalleryCard = ReturnType<typeof templateGalleryCard>;

function loadLocalCards(): GalleryCard[] {
  try {
    const records = new LocalStorageTemplateRecordStore().list();
    return listPublicGallery(records).map((record) =>
      templateGalleryCard(
        sanitizeTemplateForPublicView(record, {
          publicId: record.sharing?.publicId ?? record.id,
          visibility: "public",
        }),
      ),
    );
  } catch {
    return [];
  }
}

export default function TemplateGalleryPage() {
  const { session } = useAccount();
  const [cards, setCards] = useState<GalleryCard[]>(() => loadLocalCards());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  function refresh() {
    setCards(loadLocalCards());
    void api<{ templates: GalleryCard[] }>("/template-families/public")
      .then((value) => {
        const remote = Array.isArray(value.templates) ? value.templates : [];
        setCards((current) => {
          const byId = new Map<string, GalleryCard>();
          for (const card of [...remote, ...current]) byId.set(card.id, card);
          return Array.from(byId.values());
        });
      })
      .catch(() => {
        /* offline is fine. local gallery still renders */
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function fork(id: string) {
    setError("");
    try {
      await post(`/template-families/${id}/fork`, {});
      setNotice("Copied into your library.");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const sources = useMemo(
    () => Array.from(new Set(cards.map((card) => card.source))).sort(),
    [cards],
  );

  const visible = cards.filter(
    (card) =>
      (sourceFilter === "all" || card.source === sourceFilter) &&
      (filter.trim() === "" ||
        `${card.name} ${card.pageRoles.join(" ")} ${card.creatorName ?? ""}`
          .toLowerCase()
          .includes(filter.trim().toLowerCase())),
  );

  return (
    <AppShell
      activeNavId="templates"
      contentWidth="wide"
      userName={session.user?.name}
      guest={!session.user}
      currentScope={{
        type: "personal",
        name: session.user?.name || "Guest",
        subName: "Templates",
      }}
    >
      <div className="flex flex-col gap-6">
        <HeroPanel
          scene="gallery"
          kicker="Templates"
          title="A starting point. Then yours."
          subtitle="Approved layouts you can use with your own copy."
          art={<LayoutTemplate size={72} className="text-accent" />}
        />

        <FilterBar>
          <SearchInput
            label="Search templates"
            value={filter}
            onChange={setFilter}
            className="w-[220px] max-sm:w-full"
          />
          <FilterChip
            label="All"
            active={sourceFilter === "all"}
            onClick={() => setSourceFilter("all")}
            count={cards.length}
          />
          {sources.map((source) => (
            <FilterChip
              key={source}
              label={source}
              active={sourceFilter === source}
              onClick={() => setSourceFilter(source)}
            />
          ))}
        </FilterBar>

        {notice && (
          <p className="m-0 rounded-2xl bg-success-muted px-4 py-2 text-sm text-success">
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="m-0 rounded-2xl bg-danger-muted px-4 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {visible.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="Approve a template and make it public to see it here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((card) => (
              <TemplateCard
                key={card.id}
                id={card.id}
                name={card.name}
                description={card.description}
                layoutCount={card.layoutCount}
                status="approved"
                source={card.source}
                previewSrc={card.primaryPreview?.src}
                canFork={Boolean(session.user) && card.allowForking}
                onUse={() => location.assign(`/create?template=${card.id}`)}
                onFork={() => void fork(card.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
