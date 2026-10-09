import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  GitFork,
  Globe,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { api, post, useAccount } from "../../shared/api/api";
import { Button } from "../../shared/components/ui/Button";
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

function Card(props: {
  card: GalleryCard;
  onFork: (id: string) => void;
  canFork: boolean;
}) {
  const { card } = props;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div
        className="flex items-center justify-center bg-slate-900 p-3"
        style={{ aspectRatio: "3/2" }}
      >
        {card.primaryPreview?.src ? (
          <img
            src={card.primaryPreview.src}
            alt={`${card.name} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="h-6 w-6 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-500">
              {card.layoutCount} layouts
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">{card.name}</h3>
          <span className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {card.source}
          </span>
        </div>
        {card.description && (
          <p className="line-clamp-2 text-[11px] text-slate-400">
            {card.description}
          </p>
        )}
        <p className="text-[11px] text-slate-500">
          {card.creatorName ? `${card.creatorName} · ` : ""}
          {card.layoutCount} layouts · {card.pageRoles.join(", ")}
          {card.averageQualityScore !== undefined
            ? ` · q${card.averageQualityScore}`
            : ""}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <a
            href={`/template/${card.id}`}
            className="rounded border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            Preview
          </a>
          <a
            href={`/create?template=${card.id}`}
            className="rounded border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            Use in create
          </a>
          {card.allowForking && (
            <button
              type="button"
              onClick={() => props.onFork(card.id)}
              disabled={!props.canFork}
              title={props.canFork ? undefined : "Sign in to fork."}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GitFork className="h-3.5 w-3.5" /> Fork
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
        /* offline is fine — local gallery still renders */
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function fork(id: string) {
    setError("");
    try {
      await post(`/template-families/${id}/fork`, {});
      setNotice(
        "Forked into your library — a private copy with lineage preserved.",
      );
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
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
        <div className="flex items-center gap-4">
          <a
            href="/dev/templates"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Authoring lab
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold tracking-wide text-white">
              Template gallery
            </span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-xs text-emerald-300">
              Phase 6 v1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter approved public templates"
              className="w-64 rounded border border-slate-800 bg-slate-900 py-1.5 pl-7 pr-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs text-slate-500">
          Only approved, public, gallery-listed templates appear here. Drafts,
          candidates, and rejected templates can never be listed. There is no
          ranking, rating, or payment in this version.
        </p>

        {notice && (
          <p className="mt-4 rounded border border-emerald-700/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {error}
          </p>
        )}

        {visible.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-slate-500">
            <Globe className="h-10 w-10 stroke-1 text-slate-600" />
            <p className="text-sm text-slate-300">No public templates yet</p>
            <p className="max-w-md text-center text-xs">
              Approve a template in the authoring lab, set its visibility to
              public, and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((card) => (
              <Card
                key={card.id}
                card={card}
                canFork={Boolean(session.user)}
                onFork={(id) => void fork(id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
