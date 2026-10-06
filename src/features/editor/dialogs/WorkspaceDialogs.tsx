import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  History,
  Palette,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api, post } from "../../../shared/api/api";
import {
  fontFamilies,
  type FontFamily,
  type Project,
} from "../../../domain/design/model";
import {
  applyBrandToProject,
  brandNeedsUpgrade,
  defaultBrandSystem,
  normalizeBrand,
  readGuestBrand,
  writeGuestBrand,
  type BrandSystem,
} from "../../../domain/design/designSystem";
import { Button } from "../../../shared/components/ui/Button";

export function VersionHistory({
  project,
  onRestore,
}: {
  project: Project;
  onRestore: (p: Project) => void;
}) {
  const [versions, setVersions] = useState<
    { id: string; version: number; createdAt: string; name: string }[]
  >([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    void api<{ revisions: typeof versions }>(
      `/projects/${project.id}/revisions`,
    )
      .then((r) => setVersions(r.revisions))
      .catch((e) => setError(e.message));
  }, [project.id]);
  return (
    <div>
      <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-6">
        Return to an earlier saved design. Restoring creates a new version and
        keeps your history.
      </p>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="version-list">
        {!versions.length && !error && (
          <p className="text-xs text-text-tertiary mt-2">
            Your saved changes will appear here.
          </p>
        )}
        {versions.map((v) => (
          <div key={v.id}>
            <History size={18} />
            <span>
              <strong>Version {v.version}</strong>
              <small>{new Date(v.createdAt).toLocaleString()}</small>
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!!busy}
              onClick={async () => {
                setBusy(v.id);
                try {
                  const r = await api<{ project: Project }>(
                    `/projects/${project.id}/revisions/${v.id}`,
                  );
                  onRestore({ ...r.project, id: project.id });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === v.id ? "Restoring…" : "Restore"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
type ReviewLink = {
  token: string;
  url: string;
  expiresAt: string;
  status: string;
};
export function ShareReview({
  project,
  saveNow,
}: {
  project: Project;
  saveNow: () => Promise<unknown>;
}) {
  const [links, setLinks] = useState<ReviewLink[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [days, setDays] = useState(7);
  const [requireAuth, setRequireAuth] = useState(false);
  const refresh = () =>
    api<{ reviews: ReviewLink[] }>(`/projects/${project.id}/reviews`).then(
      (r) => setLinks(r.reviews),
    );
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [project.id]);
  return (
    <div>
      <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-6">
        Create a private review link for the current design. Each link keeps a
        fixed snapshot, with comments and approval. Creating a link does not
        send it to anyone. Authenticated approvals record the signed-in reviewer
        instead of a self-reported name.
      </p>
      <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary mb-4">
        Link expires after
        <select
          className="px-3 py-3 border border-border rounded-sm bg-bg-panel text-text-primary"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>1 day</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={requireAuth}
          onChange={(e) => setRequireAuth(e.target.checked)}
        />
        Require signed-in approval
      </label>
      <Button
        variant="primary"
        fullWidth
        className="mt-6"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await saveNow();
            await post(`/projects/${project.id}/reviews`, {
              expiresInDays: days,
              requireAuthenticatedApproval: requireAuth,
            });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Plus size={16} />
        {busy ? "Creating snapshot…" : "Create review link"}
      </Button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="share-links">
        {links.map((link) => (
          <div key={link.token}>
            <div>
              <span className="small-pill">
                {link.status.replace("_", " ")}
              </span>
              <small>
                Expires {new Date(link.expiresAt).toLocaleDateString()}
              </small>
            </div>
            <input
              readOnly
              aria-label="Review URL"
              value={new URL(link.url, window.location.origin).href}
            />
            <div className="share-link-actions">
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(new URL(link.url, window.location.origin).href)
                    .then(
                      () => setCopied(link.token),
                      () =>
                        setError("Select the URL above and copy it manually."),
                    )
                }
              >
                <Copy size={13} />
                {copied === link.token ? "Copied" : "Copy link"}
              </button>
              <a href={link.url} target="_blank" rel="noreferrer">
                <ExternalLink size={13} />
                Open review
              </a>
              <button
                onClick={async () => {
                  try {
                    await api(`/projects/${project.id}/reviews/${link.token}`, {
                      method: "DELETE",
                    });
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Trash2 size={13} />
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary mt-3"
        onClick={() => void refresh().catch((e) => setError(e.message))}
      >
        <RefreshCw size={13} /> Refresh feedback status
      </button>
      <p className="text-xs text-text-tertiary mt-3">
        Anyone with the link can view, comment, and change its review status.
        Revoking a link closes that access immediately.
      </p>
    </div>
  );
}
export function BrandSettings({
  project,
  onApply,
  onMessage,
}: {
  project: Project;
  onApply: (p: Partial<Project>) => void;
  onMessage: (s: string) => void;
}) {
  const [brand, setBrand] = useState(defaultBrandSystem());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    void api<BrandSystem>("/brand")
      .then((data) => {
        setBrand(normalizeBrand(data));
        setGuest(false);
      })
      .catch(() => {
        setBrand(readGuestBrand());
        setGuest(true);
      });
  }, []);
  const outdated = brandNeedsUpgrade(project, brand);
  return (
    <div className="brand-settings">
      <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-6">
        Versioned brand tokens for text, background, accent and fonts. Applying
        a brand is an explicit design change; your manuscript stays untouched.
      </p>
      <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary mb-4">
        Brand name
        <input
          value={brand.name}
          maxLength={100}
          onChange={(e) => setBrand({ ...brand, name: e.target.value })}
        />
      </label>
      <div className="brand-colors">
        {(
          [
            ["text", "Text color"],
            ["background", "Background color"],
            ["accent", "Accent color"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary"
          >
            {label}
            <input
              type="color"
              aria-label={label}
              value={brand.colors[key]}
              onChange={(e) =>
                setBrand({
                  ...brand,
                  colors: { ...brand.colors, [key]: e.target.value },
                })
              }
            />
            <code>{brand.colors[key]}</code>
          </label>
        ))}
      </div>
      <div className="brand-colors">
        <span className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary">
          More brand colors
        </span>
        {brand.palette.map((color, index) => (
          <label
            key={index}
            className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary"
          >
            Color {index + 1}
            <input
              type="color"
              aria-label={`Brand color ${index + 1}`}
              value={color}
              onChange={(event) =>
                setBrand({
                  ...brand,
                  palette: brand.palette.map((item, i) =>
                    i === index ? event.target.value : item,
                  ),
                })
              }
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setBrand({
                  ...brand,
                  palette: brand.palette.filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </Button>
          </label>
        ))}
        {brand.palette.length < 12 && (
          <Button
            variant="secondary"
            onClick={() =>
              setBrand({ ...brand, palette: [...brand.palette, "#64748b"] })
            }
          >
            Add brand color
          </Button>
        )}
      </div>
      <div className="brand-colors">
        <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary">
          Display font
          <select
            aria-label="Display font"
            value={brand.fonts.display}
            onChange={(e) =>
              setBrand({
                ...brand,
                fonts: {
                  ...brand.fonts,
                  display: e.target.value as FontFamily,
                },
              })
            }
          >
            {fontFamilies.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary">
          Body font
          <select
            aria-label="Body font"
            value={brand.fonts.body}
            onChange={(e) =>
              setBrand({
                ...brand,
                fonts: {
                  ...brand.fonts,
                  body: e.target.value as FontFamily,
                },
              })
            }
          >
            {fontFamilies.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-[9px] text-[11px] font-[550] text-text-secondary mb-4">
        Spacing notes
        <input
          value={brand.spacingNote}
          maxLength={500}
          placeholder="Optional layout notes for this brand"
          onChange={(e) => setBrand({ ...brand, spacingNote: e.target.value })}
        />
      </label>
      <p className="text-xs text-text-tertiary mt-2">
        Version {brand.version}
        {outdated
          ? ` · this design pins v${project.brandRef?.version} and can upgrade`
          : project.brandRef
            ? ` · this design pins v${project.brandRef.version}`
            : ""}
        {guest ? " · saved in this browser" : ""}
      </p>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <Button
        variant="secondary"
        fullWidth
        className="mt-4"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (guest) {
              const saved = {
                ...brand,
                version: Math.max(1, brand.version + 1),
                updatedAt: new Date().toISOString(),
              };
              writeGuestBrand(saved);
              setBrand(saved);
              onMessage(`Brand system saved (v${saved.version}).`);
            } else {
              const saved = normalizeBrand(
                await api("/brand", {
                  method: "PUT",
                  body: JSON.stringify(brand),
                }),
              );
              setBrand(saved);
              onMessage(`Brand system saved (v${saved.version}).`);
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Check size={16} />
        Save brand system
      </Button>
      <Button
        variant="primary"
        fullWidth
        className="mt-3"
        disabled={project.designMode === "reference"}
        onClick={() => {
          onApply(applyBrandToProject(project, brand));
          onMessage(
            outdated
              ? `Brand v${brand.version} applied. Manuscript unchanged.`
              : "Brand colors and fonts applied. Manuscript unchanged.",
          );
        }}
      >
        <Palette size={16} />
        {outdated
          ? "Upgrade brand on this design"
          : "Apply brand to this design"}
      </Button>
      {project.designMode === "reference" && (
        <p className="text-xs text-text-tertiary mt-3">
          Brand tokens apply to editable templates. Reference artwork stays
          unchanged.
        </p>
      )}
    </div>
  );
}
