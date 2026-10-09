import { useEffect, useState } from "react";
import {
  ArrowLeft,
  GitFork,
  Globe,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, post, useAccount } from "../../shared/api/api";
import type {
  PublicTemplatePayload,
  TemplatePreviewDescriptor,
} from "../../domain/template-sharing/index.js";
import type { TemplateForkLineage } from "../../domain/template-authoring/index.js";

interface SharedTemplateResponse {
  template: PublicTemplatePayload;
  forkedFrom: TemplateForkLineage | null;
}

function PreviewCard(props: { preview: TemplatePreviewDescriptor }) {
  const { preview } = props;
  const src = preview.src;
  const isImage =
    typeof src === "string" &&
    (src.startsWith("data:image") || /^https?:\/\//.test(src));
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px] text-slate-300">
        <span>{preview.label}</span>
        <span className="font-mono text-emerald-400">{preview.role}</span>
      </div>
      <div
        className="flex items-center justify-center bg-slate-900 p-2"
        style={{ aspectRatio: "612/792" }}
      >
        {isImage ? (
          <img
            src={src}
            alt={`${preview.label} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <Sparkles className="h-6 w-6 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-500">
              {preview.kind === "placeholder"
                ? "no preview asset"
                : "layout preview"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicTemplatePage(props: { token: string }) {
  const { token } = props;
  const { session } = useAccount();
  const [data, setData] = useState<SharedTemplateResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<SharedTemplateResponse>(`/template-families/shared/${token}`)
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((cause) => {
        if (alive)
          setError(
            cause instanceof Error
              ? cause.message
              : "This template link is unavailable.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function fork() {
    if (!data) return;
    setError("");
    try {
      await post(`/template-families/${data.template.id}/fork`, { token });
      setNotice(
        "Forked into your library. It is a private copy — the original is untouched.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const VisibilityIcon = data?.template.visibility === "public" ? Globe : Link2;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
        <a
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Forma
        </a>
        <span className="rounded border border-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-400">
          Shared template · read-only
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {loading && <p className="text-sm text-slate-400">Loading template…</p>}

        {!loading && error && (
          <div className="rounded border border-rose-600/40 bg-rose-500/10 p-4 text-sm text-rose-300">
            <p className="font-medium">This template link is unavailable.</p>
            <p className="mt-1 text-rose-200/80">{error}</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <VisibilityIcon className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  {data.template.visibility}
                </span>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  approved
                </span>
                <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {data.template.source}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white">
                {data.template.name}
              </h1>
              {data.template.description && (
                <p className="mt-1 max-w-2xl text-sm text-slate-400">
                  {data.template.description}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {data.template.attribution?.creatorName
                  ? `By ${data.template.attribution.creatorName} · `
                  : ""}
                v{data.template.versionNumber} · {data.template.layoutCount}{" "}
                layouts
                {data.template.license ? ` · ${data.template.license}` : ""}
              </p>
            </div>

            {notice && (
              <p className="rounded border border-emerald-700/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {notice}
              </p>
            )}
            {error && !notice && (
              <p className="rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {data.template.allowForking && (
                <button
                  type="button"
                  onClick={() => void fork()}
                  disabled={!session.user}
                  title={
                    session.user
                      ? undefined
                      : "Sign in to fork this template into your library."
                  }
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GitFork className="h-4 w-4" /> Fork into my library
                </button>
              )}
              <a
                href={`/create?template=${data.template.id}`}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                Use in create
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              Generation always runs on your own approved or forked copy — the
              shared template is never used directly. Forking creates a private
              copy with lineage preserved; approving or editing the original is
              never possible from here.
            </p>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-200">
                Layout previews
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {data.template.previews.map((preview) => (
                  <PreviewCard key={preview.layoutId} preview={preview} />
                ))}
              </div>
              {data.template.previews.length === 0 && (
                <p className="text-xs text-slate-500">No layout previews.</p>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-slate-800 bg-slate-950 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Quality summary
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                  <dt className="text-slate-500">Validation</dt>
                  <dd className="text-slate-300">
                    {data.template.quality.validationStatus}
                  </dd>
                  <dt className="text-slate-500">Approved layouts</dt>
                  <dd className="text-slate-300">
                    {data.template.quality.approvedLayoutCount}/
                    {data.template.quality.layoutCount}
                  </dd>
                  {data.template.quality.averageQualityScore !== undefined && (
                    <>
                      <dt className="text-slate-500">Avg quality</dt>
                      <dd className="text-slate-300">
                        {data.template.quality.averageQualityScore}/100
                      </dd>
                    </>
                  )}
                  {data.template.quality.exactCopyPassRate !== undefined && (
                    <>
                      <dt className="text-slate-500">Exact copy pass</dt>
                      <dd className="text-slate-300">
                        {Math.round(
                          data.template.quality.exactCopyPassRate * 100,
                        )}
                        %
                      </dd>
                    </>
                  )}
                  <dt className="text-slate-500">Page roles</dt>
                  <dd className="text-slate-300">
                    {data.template.pageRoles.join(", ")}
                  </dd>
                </dl>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-slate-200">
                  Warnings
                </h3>
                {data.template.quality.warnings.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No public warnings.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-amber-300">
                    {data.template.quality.warnings.map((warning) => (
                      <li key={warning.code}>
                        <strong>{warning.code}</strong>: {warning.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {(data.forkedFrom || data.template.lineageRootId) && (
              <section className="rounded border border-slate-800 bg-slate-950 p-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <GitFork className="h-4 w-4 text-slate-400" /> Lineage
                </h2>
                <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-y-1 text-xs">
                  <dt className="text-slate-500">Forked from</dt>
                  <dd className="font-mono text-slate-300">
                    {data.forkedFrom?.forkedFromTemplateId ??
                      data.template.forkedFromOriginalTemplateId ??
                      "—"}
                  </dd>
                  <dt className="text-slate-500">Original template</dt>
                  <dd className="font-mono text-slate-300">
                    {data.forkedFrom?.originalTemplateId ??
                      data.template.forkedFromOriginalTemplateId ??
                      "—"}
                  </dd>
                  <dt className="text-slate-500">Lineage root</dt>
                  <dd className="font-mono text-slate-300">
                    {data.forkedFrom?.lineageRootId ??
                      data.template.lineageRootId ??
                      "—"}
                  </dd>
                  {data.forkedFrom?.forkedAt && (
                    <>
                      <dt className="text-slate-500">Forked at</dt>
                      <dd className="text-slate-300">
                        {data.forkedFrom.forkedAt.slice(0, 10)}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Lock className="h-3 w-3" />
              This page exposes only the sanitized public payload. Owner ids,
              internal notes, usage analytics, and reference lineage are never
              shared.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
