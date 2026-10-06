import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isFieldSelect,
  navFromTool,
  parseEditorTool,
  projectEditorUrl,
  toolFromNav,
} from "../src/features/editor/lib/editorNav.ts";

describe("editor deep links", () => {
  it("maps public tool names to nav ids", () => {
    assert.equal(parseEditorTool("Design"), "design");
    assert.equal(parseEditorTool("slides"), "slides");
    assert.equal(parseEditorTool("workflow"), "workflows");
    assert.equal(parseEditorTool("checks"), "issues");
    assert.equal(navFromTool("design"), "templates");
    assert.equal(navFromTool("slides"), "presentation");
    assert.equal(navFromTool("workflows"), "skills");
    assert.equal(toolFromNav("templates"), "design");
    assert.equal(toolFromNav("presentation"), "slides");
  });

  it("recognizes manuscript field select ids", () => {
    assert.equal(isFieldSelect("title"), true);
    assert.equal(isFieldSelect("layer-abc"), false);
  });

  it("keeps a project link current when a new design opens", () => {
    assert.equal(
      projectEditorUrl(
        "new-id",
        "?tool=slides&project=old-id&select=title",
        "/editor",
      ),
      "/editor?tool=slides&project=new-id",
    );
  });
});
