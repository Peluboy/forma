import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocumentProject,
  documentIssues,
  fixtureOnePager,
  fixtureTenPageReport,
  fixtureTwentyPageWhitepaper,
  parseDocumentManuscript,
  paginateDocument,
} from "../src/domain/design/flowDocument.ts";
import { isProject } from "../src/domain/design/model.ts";
import {
  readDesignFile,
  serializeDesignFile,
} from "../src/domain/design/document.ts";

test("parses headings, tables and citations without dropping copy", () => {
  const blocks = parseDocumentManuscript(
    `Heading: Title one\n\nBody paragraph stays intact.\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[^1]: A citation.`,
  );
  assert.equal(
    blocks.some((b) => b.kind === "heading"),
    true,
  );
  assert.equal(
    blocks.some((b) => b.kind === "table"),
    true,
  );
  assert.equal(
    blocks.some((b) => b.kind === "citation"),
    true,
  );
  assert.equal(
    blocks.find((b) => b.kind === "paragraph")?.text,
    "Body paragraph stays intact.",
  );
});

test("one-pager fixture preserves tables and citations", () => {
  const doc = fixtureOnePager();
  assert.equal(isProject(doc), true);
  assert.equal(doc.family, "document");
  assert.ok(doc.flow && doc.flow.pages.length >= 1);
  assert.ok(doc.flow!.content.some((c) => c.kind === "table"));
  assert.ok(doc.flow!.content.some((c) => c.kind === "citation"));
  const unmapped = documentIssues(doc).filter((i) => /unmapped/i.test(i));
  assert.deepEqual(unmapped, []);
});

test("10-page and 20-page fixtures paginate without losing content blocks", () => {
  const ten = fixtureTenPageReport();
  const twenty = fixtureTwentyPageWhitepaper();
  assert.ok(ten.flow!.pages.length >= 3);
  assert.ok(twenty.flow!.pages.length >= 5);
  for (const doc of [ten, twenty]) {
    const ids = new Set(doc.flow!.content.map((c) => c.id));
    const placed = new Set<string>();
    for (const page of doc.flow!.pages) {
      for (const el of page.elements) {
        if (el.type === "text") el.contentIds.forEach((id) => placed.add(id));
        else placed.add(el.contentId);
      }
    }
    for (const id of ids) assert.equal(placed.has(id), true, id);
    assert.equal(isProject(doc), true);
    assert.deepEqual(
      readDesignFile(JSON.parse(serializeDesignFile(doc))).flow?.content.length,
      doc.flow!.content.length,
    );
  }
});

test("long tables split across pages with repeated headers", () => {
  const rows = ["| Name | Value |", "| --- | --- |"];
  for (let i = 0; i < 60; i++) rows.push(`| Row ${i} | Value ${i} |`);
  const content = parseDocumentManuscript(rows.join("\n"));
  const flow = paginateDocument(content);
  const tables = flow.pages.flatMap((p) =>
    p.elements.filter((e) => e.type === "table"),
  );
  assert.ok(tables.length >= 2);
  assert.ok(tables.every((t) => t.type === "table" && t.rows[0][0] === "Name"));
});

test("createDocumentProject from short copy stays a valid single page", () => {
  const project = createDocumentProject(
    "Heading: Brief\n\nOnly a little copy.",
    "Brief",
  );
  assert.equal(project.flow!.pages.length, 1);
  assert.equal(
    documentIssues(project).some((i) => /unmapped/i.test(i)),
    false,
  );
});
