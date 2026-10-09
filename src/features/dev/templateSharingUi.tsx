import { useMemo, useState } from "react";
import { Link2, Globe, Lock, Eye, GitFork, Ban } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import {
  getSharingState,
  canShareTemplate,
  canForkTemplate,
  sharingBlockReason,
  forkingBlockReason,
  sanitizeTemplateForPublicView,
  templatePreviewDescriptor,
  shareTemplateRecord,
  revokeTemplateShare,
  setTemplateVisibility,
  type TemplateActor,
} from "../../domain/template-sharing/index.js";
import type {
  TemplateFamilyRecord,
  TemplateLicense,
  TemplateVisibility,
} from "../../domain/template-authoring/index.js";

const LICENSES: TemplateLicense[] = [
  "private_use",
  "internal_use",
  "free_to_fork",
  "custom",
];

export function VisibilityChip(props: { visibility: TemplateVisibility }) {
  const map: Record<TemplateVisibility, string> = {
    private: "border-slate-700 text-slate-300",
    unlisted: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    public: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };
  const Icon =
    props.visibility === "private"
      ? Lock
      : props.visibility === "public"
        ? Globe
        : Link2;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${map[props.visibility]}`}
    >
      <Icon className="h-3 w-3" />
      {props.visibility}
    </span>
  );
}

export function LineageBlock(props: { record: TemplateFamilyRecord }) {
  const lineage = props.record.forkedFrom;
  if (!lineage) return null;
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
        <GitFork className="h-3.5 w-3.5 text-slate-400" />
        Fork lineage
      </div>
      <dl className="mt-2 grid grid-cols-[9rem_1fr] gap-y-1 text-slate-300">
        <dt className="text-slate-500">Forked from</dt>
        <dd className="font-mono">{lineage.forkedFromTemplateId}</dd>
        <dt className="text-slate-500">Original version</dt>
        <dd className="font-mono">{lineage.forkedFromVersionId}</dd>
        <dt className="text-slate-500">Original template</dt>
        <dd className="font-mono">{lineage.originalTemplateId}</dd>
        <dt className="text-slate-500">Lineage root</dt>
        <dd className="font-mono">{lineage.lineageRootId}</dd>
        <dt className="text-slate-500">Forked at</dt>
        <dd>{lineage.forkedAt.slice(0, 19).replace("T", " ")}</dd>
        {lineage.forkOwnerName && (
          <>
            <dt className="text-slate-500">Fork owner</dt>
            <dd>{lineage.forkOwnerName}</dd>
          </>
        )}
        <dt className="text-slate-500">Current version</dt>
        <dd>
          v{props.record.versionNumber} · {props.record.status}
        </dd>
      </dl>
    </div>
  );
}

export interface TemplateSharingPanelProps {
  record: TemplateFamilyRecord;
  ownerId?: string;
  isDev?: boolean;
  onSave: (record: TemplateFamilyRecord) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onForkAsViewer?: (record: TemplateFamilyRecord) => void;
}

export function TemplateSharingPanel(props: TemplateSharingPanelProps) {
  const { record, ownerId, isDev, onSave, onNotice, onError, onForkAsViewer } =
    props;
  const actor: TemplateActor = {
    ownerId: ownerId ?? null,
    signedIn: !!ownerId,
  };
  const sharing = getSharingState(record);
  const canShare = canShareTemplate(record, actor);
  const blockReason = sharingBlockReason(record, actor);

  const [visibility, setVisibility] = useState<TemplateVisibility>(
    sharing.visibility,
  );
  const [allowForking, setAllowForking] = useState(sharing.allowForking);
  const [license, setLicense] = useState<TemplateLicense>(
    sharing.license ?? "private_use",
  );
  const [creatorName, setCreatorName] = useState(
    sharing.attribution?.creatorName ?? "",
  );

  const shareUrl = useMemo(() => {
    if (sharing.visibility === "public" && sharing.publicId)
      return `${location.origin}/template/${sharing.publicId}`;
    if (sharing.visibility === "unlisted" && sharing.shareToken)
      return `${location.origin}/template/${sharing.shareToken}`;
    return "";
  }, [sharing.visibility, sharing.publicId, sharing.shareToken]);

  function applyShare(nextVisibility: TemplateVisibility) {
    try {
      const updated =
        nextVisibility === "private"
          ? setTemplateVisibility(record, actor, "private")
          : shareTemplateRecord(record, actor, {
              visibility: nextVisibility,
              allowForking,
              galleryListed: nextVisibility === "public",
              license,
              creatorName: creatorName || undefined,
            }).record;
      onSave(updated);
      setVisibility(nextVisibility);
      onNotice(
        nextVisibility === "private"
          ? "Template is now private."
          : `Template shared as ${nextVisibility}.`,
      );
    } catch (cause) {
      onError((cause as Error).message);
    }
  }

  function updateSharing() {
    if (!canShare) return;
    applyShare(visibility === "private" ? "unlisted" : visibility);
  }

  function revoke() {
    try {
      const updated = revokeTemplateShare(record, actor);
      onSave(updated);
      setVisibility("private");
      onNotice("Share link revoked. Existing forks and projects are kept.");
    } catch (cause) {
      onError((cause as Error).message);
    }
  }

  function copyShareLink() {
    if (!shareUrl) return;
    void navigator.clipboard
      ?.writeText(shareUrl)
      .then(() => onNotice("Share link copied to the clipboard."))
      .catch(() => onError("Could not copy the link — copy it manually."));
  }

  function forkAsViewer() {
    if (!onForkAsViewer) return;
    onForkAsViewer(record);
  }

  const previews = templatePreviewDescriptor(record);
  const publicPreview = canShare
    ? sanitizeTemplateForPublicView(record, {
        publicId: sharing.publicId ?? sharing.shareToken ?? "preview",
        visibility:
          sharing.visibility === "private" ? "unlisted" : sharing.visibility,
      })
    : null;

  return (
    <div className="space-y-5">
      {!canShare && (
        <div className="flex items-start gap-2 rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            <p className="font-medium text-slate-200">Sharing disabled</p>
            <p className="mt-0.5 text-slate-400">
              {blockReason ?? "This template cannot be shared yet."}
            </p>
          </div>
        </div>
      )}

      {canShare && (
        <div className="space-y-3 rounded border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Visibility
            </span>
            <VisibilityChip
              visibility={record.sharing?.visibility ?? "private"}
            />
          </div>
          <div className="flex gap-2">
            {(["private", "unlisted", "public"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setVisibility(option)}
                className={`flex-1 rounded border px-2 py-1.5 text-[11px] ${
                  visibility === option
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={allowForking}
              onChange={(event) => setAllowForking(event.target.checked)}
              className="accent-emerald-500"
            />
            Allow others to fork this template
          </label>

          <label className="block text-xs text-slate-300">
            <span className="text-slate-500">License</span>
            <select
              value={license}
              onChange={(event) =>
                setLicense(event.target.value as TemplateLicense)
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            >
              {LICENSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-slate-300">
            <span className="text-slate-500">Creator attribution</span>
            <input
              value={creatorName}
              onChange={(event) => setCreatorName(event.target.value)}
              placeholder="Display name shown on the public preview"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={updateSharing}>
              Apply sharing
            </Button>
            {record.sharing?.shareToken && (
              <Button variant="secondary" size="sm" onClick={copyShareLink}>
                Copy share link
              </Button>
            )}
            {record.sharing?.visibility !== "private" && (
              <>
                <a
                  href={shareUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  View public preview
                </a>
                <Button variant="secondary" size="sm" onClick={revoke}>
                  Revoke share
                </Button>
              </>
            )}
          </div>

          {shareUrl && (
            <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1.5">
              <Eye className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <code className="truncate text-[11px] text-slate-400">
                {shareUrl}
              </code>
            </div>
          )}
        </div>
      )}

      {isDev && canShare && record.sharing?.visibility !== "private" && (
        <div className="rounded border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-400">
            Dev: preview how another user sees and forks this template.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={shareUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Open as viewer
            </a>
            {canForkTemplate(record, { ownerId: null, signedIn: false }) ? (
              <Button variant="secondary" size="sm" onClick={forkAsViewer}>
                Fork as viewer
              </Button>
            ) : (
              <span className="text-[11px] text-slate-500">
                {forkingBlockReason(record, {
                  ownerId: null,
                  signedIn: false,
                })}
              </span>
            )}
          </div>
        </div>
      )}

      <LineageBlock record={record} />

      <div className="rounded border border-slate-800 bg-slate-950 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Public payload preview ({previews.length} preview(s))
        </p>
        {publicPreview ? (
          <>
            <dl className="mt-2 grid grid-cols-[9rem_1fr] gap-y-1 text-[11px] text-slate-300">
              <dt className="text-slate-500">id</dt>
              <dd className="font-mono">{publicPreview.id}</dd>
              <dt className="text-slate-500">templateId</dt>
              <dd className="font-mono">{publicPreview.templateId}</dd>
              <dt className="text-slate-500">layouts</dt>
              <dd>{publicPreview.layoutCount}</dd>
              <dt className="text-slate-500">page roles</dt>
              <dd>{publicPreview.pageRoles.join(", ")}</dd>
              <dt className="text-slate-500">allowForking</dt>
              <dd>{String(publicPreview.allowForking)}</dd>
              <dt className="text-slate-500">creator</dt>
              <dd>{publicPreview.attribution?.creatorName ?? "—"}</dd>
              {publicPreview.lineageRootId && (
                <>
                  <dt className="text-slate-500">lineage root</dt>
                  <dd className="font-mono">{publicPreview.lineageRootId}</dd>
                </>
              )}
            </dl>
            <p className="mt-2 text-[11px] text-slate-500">
              Owner ids, usage analytics, reference lineage, approval identity,
              and internal review notes are never included.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">
            Approve this template and share it to see the sanitized public
            payload.
          </p>
        )}
      </div>
    </div>
  );
}
