import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applySkill,
  EVENT_CAMPAIGN_SKILL,
  applyBrandToProject,
  brandNeedsUpgrade,
  builtInComponents,
  defaultBrandSystem,
  exportSkillPackage,
  importSkillPackage,
  isBrandSystem,
  normalizeBrand,
  projectFromTemplate,
  skillNeedsUpgrade,
  templateFromProject,
  type SkillManifest,
} from "../src/domain/design/designSystem.ts";
import { createProject, isProject } from "../src/domain/design/model.ts";
import { createTemplateJob } from "../src/domain/design/templateJob.ts";

test("normalizes legacy brand payloads into versioned brand systems", () => {
  const brand = normalizeBrand({
    name: "Studio",
    primary: "#112233",
    secondary: "#abcdef",
  });
  assert.equal(brand.colors.text, "#112233");
  assert.equal(brand.colors.background, "#abcdef");
  assert.equal(isBrandSystem(brand), true);
  assert.equal(builtInComponents.length >= 4, true);
});

test("applying a brand pins brandRef without changing manuscript wording", () => {
  const project = createProject();
  const before = project.manuscript;
  const brand = defaultBrandSystem({
    colors: { text: "#101010", background: "#fafafa", accent: "#cc5522" },
    fonts: { display: "Arial", body: "Georgia" },
  });
  const patch = applyBrandToProject(project, brand);
  assert.equal(patch.backgroundColor, "#fafafa");
  assert.equal(patch.layouts?.title.color, "#101010");
  assert.equal(patch.layouts?.title.fontFamily, "Arial");
  assert.deepEqual(patch.brandRef, { id: brand.id, version: brand.version });
  assert.equal(before, project.manuscript);
  assert.equal(
    brandNeedsUpgrade(
      { ...project, brandRef: { id: brand.id, version: 1 } },
      { ...brand, version: 2 },
    ),
    true,
  );
});

test("versioned templates bump on save and pin templateRef when opened", () => {
  const project = createProject();
  project.name = "Salon flyer";
  const first = templateFromProject(project);
  assert.equal(first.version, 1);
  assert.ok(first.id.startsWith("template-"));
  const second = templateFromProject(project, first);
  assert.equal(second.version, 2);
  assert.equal(second.id, first.id);
  const opened = projectFromTemplate(
    second,
    "Headline: Hello city\n\nBody copy: Come through.",
  );
  assert.equal(isProject(opened), true);
  assert.deepEqual(opened.templateRef, {
    id: second.id,
    version: 2,
  });
  assert.equal(opened.copy.title, "Hello city");
  assert.equal(opened.isTemplate, false);
});

test("event campaign skill produces two consistent graphics with all copy accounted for", () => {
  const brand = defaultBrandSystem({ name: "Event Co" });
  const results = EVENT_CAMPAIGN_SKILL.sampleManuscripts.map((manuscript) =>
    applySkill(EVENT_CAMPAIGN_SKILL, manuscript, { brand }),
  );
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(isProject(result.project), true);
    assert.equal(result.missingRequired.length, 0);
    assert.equal(result.unmapped.length, 0);
    assert.ok(result.mapped.length >= 1);
    assert.deepEqual(result.project.skillRef, {
      id: EVENT_CAMPAIGN_SKILL.id,
      version: EVENT_CAMPAIGN_SKILL.version,
    });
    assert.equal(result.project.brandRef?.id, brand.id);
    assert.ok(result.project.copy.title.length > 0);
  }
  assert.notEqual(results[0].project.copy.title, results[1].project.copy.title);
});

test("skill upgrades require explicit review and import stays declarative", () => {
  const project = createProject();
  project.skillRef = { id: EVENT_CAMPAIGN_SKILL.id, version: 1 };
  const newer: SkillManifest = {
    ...EVENT_CAMPAIGN_SKILL,
    version: 2,
    requiredLabels: ["Headline", "Footer"],
  };
  assert.equal(skillNeedsUpgrade(project, newer), true);
  assert.equal(skillNeedsUpgrade(project, EVENT_CAMPAIGN_SKILL), false);
  const pack = exportSkillPackage(EVENT_CAMPAIGN_SKILL);
  const imported = importSkillPackage(pack);
  assert.equal(imported.id, EVENT_CAMPAIGN_SKILL.id);
  assert.throws(() =>
    importSkillPackage({
      manifest: { ...EVENT_CAMPAIGN_SKILL, layoutPolicy: "rewrite" },
    }),
  );
  assert.throws(() => importSkillPackage({ bad: true }));
});

test("a saved flyer template creates an exact-copy branded job without modifying its source", () => {
  const source = createProject();
  source.isTemplate = true;
  source.name = "Agency flyer template";
  const original = structuredClone(source);
  const manuscript =
    "Headline: New client launch\n\nBody copy: Keep every word, including €25 & 10%.";
  const brand = defaultBrandSystem({
    id: "brand-client",
    name: "Client",
    colors: { text: "#123456", background: "#eeeeee", accent: "#ff6600" },
  });
  const job = createTemplateJob(source, manuscript, {
    layoutMode: "fit",
    brand,
  });
  assert.equal(job.id === source.id, false);
  assert.equal(job.isTemplate, false);
  assert.equal(job.manuscript, manuscript);
  assert.equal(job.copy.title, "New client launch");
  assert.equal(job.copy.description, "Keep every word, including €25 & 10%.");
  assert.equal(job.brandRef?.id, "brand-client");
  assert.equal(job.backgroundColor, "#eeeeee");
  assert.deepEqual(source, original);
  assert.equal(isProject(job), true);
  assert.throws(() => createTemplateJob(source, "", { layoutMode: "match" }));
});

test("fit mode only expands text into available space", () => {
  const source = createProject();
  source.isTemplate = true;
  source.layouts.title.height = 70;
  source.layouts.title.size = 44;
  const manuscript = `Headline: ${"A carefully approved long headline ".repeat(5)}\n\nBody copy: A short approved body.`;
  const close = createTemplateJob(source, manuscript, { layoutMode: "match" });
  const fit = createTemplateJob(source, manuscript, { layoutMode: "fit" });
  assert.equal(close.layouts.title.height, 70);
  assert.ok(fit.layouts.title.height > 70);
  assert.ok(
    fit.layouts.title.y + fit.layouts.title.height <=
      source.layouts.description.y - 12,
  );
});
