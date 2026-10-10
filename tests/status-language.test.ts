import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapQualityStatus,
  mapCopyStatus,
  mapFitStatus,
  mapTemplateStatus,
  mapReferenceConfidence,
  mapWorkspaceRole,
  mapExportPreflight,
  mapExportFidelity,
} from "../src/ui/status/statusMap.js";

describe("Phase 7.5: Status Language System & UI Copy", () => {
  it("maps quality score and fidelity to plain English without technical jargon", () => {
    const trustedHigh = mapQualityStatus(95, "trusted");
    assert.equal(trustedHigh.label, "Ready");
    assert.equal(trustedHigh.variant, "success");

    const medium = mapQualityStatus(80, "trusted");
    assert.equal(medium.label, "Minor limits");
    assert.equal(medium.variant, "warning");

    const low = mapQualityStatus(65, "trusted");
    assert.equal(low.label, "Needs review");
    assert.equal(low.variant, "warning");

    const loss = mapQualityStatus(95, "loss_detected");
    assert.equal(loss.label, "Editing may differ");
    assert.equal(loss.variant, "danger");
  });

  it("maps copy and fit status directly to understandable verbs", () => {
    const copyPass = mapCopyStatus(true);
    assert.equal(copyPass.label, "Copy check passed");
    assert.equal(copyPass.variant, "success");

    const copyFail = mapCopyStatus(false);
    assert.equal(copyFail.label, "Copy needs review");
    assert.equal(copyFail.variant, "danger");

    const fitPass = mapFitStatus(true);
    assert.equal(fitPass.label, "Fits page");
    assert.equal(fitPass.variant, "success");

    const fitFail = mapFitStatus(false);
    assert.equal(fitFail.label, "Layout needs review");
    assert.equal(fitFail.variant, "warning");
  });

  it("maps template authoring and sharing states to standardized pills", () => {
    assert.equal(mapTemplateStatus("approved").label, "Approved");
    assert.equal(mapTemplateStatus("approved").variant, "success");

    assert.equal(mapTemplateStatus("draft").label, "Draft");
    assert.equal(mapTemplateStatus("candidate").label, "Candidate");
    assert.equal(mapTemplateStatus("needs_changes").label, "Needs changes");
    assert.equal(mapTemplateStatus("rejected").label, "Rejected");
  });

  it("maps reference design confidence to clear user labels", () => {
    assert.equal(mapReferenceConfidence(0.9).label, "Ready to use");
    assert.equal(mapReferenceConfidence(0.6).label, "Style only");
    assert.equal(mapReferenceConfidence(0.3).label, "Needs review");

    assert.equal(mapReferenceConfidence("high").label, "Ready to use");
    assert.equal(mapReferenceConfidence("unusable").label, "Not enough detail");
  });

  it("maps workspace roles to friendly display tags", () => {
    assert.equal(mapWorkspaceRole("owner").label, "Owner");
    assert.equal(mapWorkspaceRole("admin").label, "Admin");
    assert.equal(mapWorkspaceRole("designer").label, "Designer");
    assert.equal(mapWorkspaceRole("viewer").label, "View only");
  });

  it("maps export preflight and fidelity to plain English", () => {
    assert.equal(mapExportPreflight("pass").label, "Ready to export");
    assert.equal(mapExportPreflight("blocked").label, "Export blocked");
    assert.equal(mapExportFidelity("export_trusted").label, "Ready to export");
    assert.equal(
      mapExportFidelity("export_with_approximations").label,
      "Some fonts will be replaced",
    );
  });
});
