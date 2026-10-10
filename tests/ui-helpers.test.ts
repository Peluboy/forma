import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessCopy,
  createStepIndex,
  greeting,
  mapQualityStatus,
  mapWorkspaceRole,
  monogram,
  relativeDate,
  saveDestinationLabel,
  scopeKind,
  scopeKindLabel,
  scopeTrail,
  templateMetaLine,
} from "../src/ui/index.ts";

describe("workspace/client context labels", () => {
  it("builds a personal save destination", () => {
    assert.equal(saveDestinationLabel({}), "Saved to your personal space");
    assert.equal(scopeKind({}), "personal");
    assert.equal(scopeKindLabel("personal"), "Personal");
  });

  it("builds workspace and client trails", () => {
    assert.deepEqual(
      scopeTrail({
        workspaceName: "Acme Studio",
        clientName: "Bloom Health",
        section: "Templates",
      }),
      ["Acme Studio", "Bloom Health", "Templates"],
    );
    assert.equal(
      saveDestinationLabel({
        workspaceName: "Acme Studio",
        clientName: "Bloom Health",
      }),
      "Saved to Bloom Health in Acme Studio",
    );
    assert.equal(
      scopeKind({ workspaceName: "Acme Studio", clientName: "Bloom Health" }),
      "client",
    );
  });
});

describe("create flow helpers", () => {
  it("advances Words -> Style -> Review", () => {
    assert.equal(
      createStepIndex({
        hasContent: false,
        generating: false,
        hasResults: false,
      }),
      0,
    );
    assert.equal(
      createStepIndex({
        hasContent: true,
        generating: false,
        hasResults: false,
      }),
      1,
    );
    assert.equal(
      createStepIndex({
        hasContent: true,
        generating: true,
        hasResults: false,
      }),
      2,
    );
  });
});

describe("copy and card helpers", () => {
  it("maps access copy in plain English", () => {
    assert.equal(
      accessCopy("view_only"),
      "You can view this, but you cannot edit it.",
    );
    assert.equal(
      accessCopy("no_workspace_access"),
      "You do not have access to this workspace.",
    );
  });

  it("maps quality and role labels", () => {
    assert.equal(mapQualityStatus(95).label, "Ready");
    assert.equal(mapQualityStatus(80).label, "Minor limits");
    assert.equal(mapWorkspaceRole("viewer").label, "View only");
  });

  it("formats template meta and dates", () => {
    assert.equal(
      templateMetaLine({ layoutCount: 6, category: "Report" }),
      "6 layouts · Report",
    );
    assert.equal(monogram("Bloom Health"), "BH");
    assert.ok(greeting(new Date(2026, 9, 9, 9)).startsWith("Good morning"));
    assert.equal(
      relativeDate(
        new Date(2026, 9, 9, 8).toISOString(),
        new Date(2026, 9, 9, 18),
      ),
      "Today",
    );
  });
});
