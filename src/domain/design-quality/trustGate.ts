import type { EditorProjectionFidelityReport } from "../design-spec/fidelity/types.js";

export type DeliverableQualityStatus =
  | "quality_trusted"
  | "quality_approximated"
  | "editor_projection_loss_detected"
  | "quality_unverified_after_projection"
  | "design_current"
  | "design_out_of_sync"
  | "native_export_current"
  | "native_export_stale";

export interface DeliverableQualityAssessment {
  designSpecScore: number;
  projectionFidelityScore: number;
  projectionOverall: EditorProjectionFidelityReport["overall"];
  status: DeliverableQualityStatus;
  /** Whether the DesignSpec score may be presented as the delivered quality. */
  trusted: boolean;
  label: string;
  reasons: string[];
  blockers: string[];
}

const MIN_TRUSTWORTHY_SCORE = 60;

/**
 * The DesignSpec score describes an idealized artifact. The editable document
 * the user receives may have lost visual elements during projection, so the
 * two signals are combined before any "quality" label is shown.
 */
export function assessDeliverableQuality(
  designSpecScore: number,
  fidelity: EditorProjectionFidelityReport,
  syncStatus?: string,
): DeliverableQualityAssessment {
  const reasons: string[] = [];
  const blockers = fidelity.blockers.map((blocker) => blocker.message);
  const lostCopy = fidelity.lost.some(
    (item) =>
      item.impact === "copy_affecting" &&
      (item.kind === "text" || item.kind === "table"),
  );

  let status: DeliverableQualityStatus;
  if (fidelity.overall === "unsafe" || lostCopy) {
    status = "editor_projection_loss_detected";
    reasons.push(
      "Editor projection lost required content or failed structural checks.",
    );
  } else if (fidelity.overall === "low") {
    status = "quality_unverified_after_projection";
    reasons.push(
      "Projection fidelity is low; the DesignSpec score does not describe the editable document.",
    );
  } else if (fidelity.overall === "medium") {
    status = "quality_approximated";
    reasons.push("Some design properties were approximated during projection.");
  } else if (designSpecScore < MIN_TRUSTWORTHY_SCORE) {
    status = "quality_unverified_after_projection";
    reasons.push(
      `DesignSpec score ${designSpecScore} is below the trusted floor.`,
    );
  } else {
    status = "quality_trusted";
    reasons.push("DesignSpec and editor projection agree within tolerance.");
  }

  if (
    syncStatus === "stale" ||
    syncStatus === "unsupported_edit_detected" ||
    syncStatus === "design_out_of_sync" ||
    syncStatus === "native_export_stale"
  ) {
    status = "design_out_of_sync";
    reasons.push("Latest edits are not yet in the native design file.");
  } else if (syncStatus === "in_sync" || syncStatus === "design_current") {
    if (status === "quality_trusted") status = "design_current";
  }

  const trusted =
    (status === "quality_trusted" ||
      status === "quality_approximated" ||
      status === "design_current") &&
    !lostCopy &&
    fidelity.overall !== "unsafe";

  const label = trusted
    ? status === "quality_approximated"
      ? `Design quality ${designSpecScore}/100 (approximated in editor)`
      : `Design quality ${designSpecScore}/100`
    : status === "editor_projection_loss_detected"
      ? "Editable output did not preserve the approved design — quality unverified"
      : "Quality unverified after projection — editable output changed the design";

  return {
    designSpecScore,
    projectionFidelityScore: fidelity.score,
    projectionOverall: fidelity.overall,
    status,
    trusted,
    label,
    reasons,
    blockers,
  };
}
