import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import {
  layoutApprovalStatus,
  type LayoutApprovalStatus,
  type TemplateFamilyRecord,
} from "../../domain/template-authoring/index.js";

export function LayoutReview(props: {
  record: TemplateFamilyRecord;
  onReview: (
    record: TemplateFamilyRecord,
    layoutId: string,
    status: LayoutApprovalStatus,
  ) => void;
  onApproveAll: () => void;
}) {
  const { record, onReview, onApproveAll } = props;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onApproveAll}>
          Approve all layouts
        </Button>
        <span className="text-xs text-slate-400">
          Rejected layouts can never be selected by the planner. Needs-changes
          layouts are excluded from production generation.
        </span>
      </div>
      {record.family.layouts.map((layout) => {
        const status = layoutApprovalStatus(record.approval, layout.id);
        return (
          <div
            key={layout.id}
            className="rounded border border-slate-800 bg-slate-950 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200">
                  {layout.name} · <span className="font-mono">{layout.id}</span>
                </span>
                <span className="ml-2 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {layout.role}
                </span>
              </div>
              <LayoutStatusChip status={status} />
            </div>
            <ul className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-400">
              {layout.slots.map((slot) => (
                <li
                  key={slot.id}
                  className="rounded border border-slate-800 px-1.5 py-0.5 font-mono"
                >
                  {slot.role ?? slot.id}
                  {slot.required ? " *" : ""}
                </li>
              ))}
              {layout.slots.length === 0 && (
                <li className="text-slate-500">
                  continuation layout · no slots
                </li>
              )}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                ["approved", "needs_changes", "rejected", "unreviewed"] as const
              ).map((next) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => onReview(record, layout.id, next)}
                  className={`rounded border px-2 py-1 text-[11px] ${
                    status === next
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {next}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Stat(props: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {props.label}
      </span>
      <div className="mt-1 text-lg font-bold text-white">{props.value}</div>
      {props.detail && (
        <div className="text-[11px] text-slate-500">{props.detail}</div>
      )}
    </div>
  );
}

export function Section(props: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        {props.title}
      </h4>
      {props.children}
    </div>
  );
}

export function Chip(props: { children: ReactNode }) {
  return (
    <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono">
      {props.children}
    </span>
  );
}

export function StatusChip(props: { status: TemplateFamilyRecord["status"] }) {
  const color =
    props.status === "approved"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : props.status === "rejected"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : props.status === "archived"
          ? "border-slate-600 bg-slate-800 text-slate-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${color}`}
    >
      {props.status}
    </span>
  );
}

function LayoutStatusChip(props: { status: LayoutApprovalStatus }) {
  const color =
    props.status === "approved"
      ? "text-emerald-300"
      : props.status === "rejected"
        ? "text-rose-300"
        : props.status === "needs_changes"
          ? "text-amber-300"
          : "text-slate-400";
  return (
    <span className={`text-[11px] font-medium ${color}`}>{props.status}</span>
  );
}

export function coverageLabel(record: TemplateFamilyRecord): string {
  const c = record.quality.coverage;
  return [
    c.hasCover,
    c.hasContent,
    c.hasTable,
    c.hasStats,
    c.hasQuote,
    c.hasClosing,
  ]
    .filter(Boolean)
    .length.toString();
}

export function statusExplanation(record: TemplateFamilyRecord): string {
  switch (record.status) {
    case "approved":
      return "This template is approved and selectable in generation. Approved layouts are the only ones the planner may use.";
    case "candidate":
      return "This is a candidate. It is not selectable in generation until it is reviewed and approved.";
    case "draft":
      return "This is a draft. It has not been submitted for review and is not usable in generation.";
    case "rejected":
      return "This template was rejected and is never selectable in generation.";
    case "archived":
      return "This template is archived. It is kept for history and is not selectable in generation.";
  }
}
