# Agency use-case assessment

October 4, 2026. This is a product assessment, not a feature-completion claim. Read with [current status](STATUS.md) and [product direction](product-expansion.md).

## The reporting-design-system brief

The brief asks for one reporting system across artifacts, PowerPoint decks and other reports inside a Claude Team account; a reusable skill; reliably designed tables; team-wide use; easy future updates; and relevant prior Claude Design examples.

| Requirement | Forma today | Honest answer |
|---|---|---|
| Repeatable brand, template and skill definitions | Versioned brand tokens/templates and a declarative Event campaign skill exist | Partial. There is no proven agency-ready report-system authoring and publishing journey. |
| Multi-page reports and tables | Document model, pagination, table splitting and PDF path exist | Partial. Table visual quality and representative long-document exports have not been accepted. |
| Editable PowerPoint | PPTX adapter exists and produces a structurally valid package | Partial. Editability and appearance in PowerPoint/Keynote have not been verified. |
| Use inside Claude Design/Claude Team | No verified Claude Design connector or Claude-compatible skill package | No. Forma cannot currently fulfill the required platform-specific setup. |
| Everyone on the team uses the same current system | Local workspace roles and publishing exist | No for hosted teams. Supabase membership, RLS, provisioning and hosted team journeys are pending. |
| Safe future updates | Version pins and explicit upgrades exist in the model | Partial. Full report/slide authoring usability and hosted lifecycle need work. |
| Relevant Claude Design work samples | No verified customer samples | No. Never imply these exist. |

**Verdict:** Forma can prototype a branded report/deck system and exercise core copy-preservation rules locally. It cannot honestly deliver this exact freelance brief end to end today. A human designer would still need to build and validate the report system in the client's Claude Team account, test sample decks/tables, package and provision the skill, and provide their own authentic work examples.

## What the market already offers

- [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) offers organization-scoped sharing, team design systems and PPTX/PDF/Canva exports; its [design-system guide](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design) describes extracting styles from existing files. [Claude skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude) can be uploaded and [provisioned across an organization](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization). These claims describe Anthropic's product, not verified Forma integration.
- [Canva](https://www.canva.com/create/reports/) offers report templates, brand fonts/colors and charts. [Adobe Express](https://helpx.adobe.com/uk/express/web/brands-libraries-projects/create-manage-brands/template-control.html) supports locked team templates, style restrictions and review. [Beautiful.ai](https://www.beautiful.ai/brand-controls-themes) and [Gamma](https://gamma.app/explore/content/guides/how-gammas-smart-layouts-keep-your-presentations-sites-and-docs-on-brand) market centralized brand controls for recurring presentations/documents.

Brand consistency or AI-assisted deck generation alone is not a defensible claim. Our hypothesis is that agencies may value a controlled production system that keeps supplied words and data traceable while turning one approved source into multiple client-ready formats. This has not been validated with paying users.

## Candidate agency workflows

| Priority | Repeatable job | Forma fit now | Missing acceptance evidence |
|---|---|---|---|
| 1 | Monthly client performance report: source metrics and approved narrative into PDF report, review deck and executive one-pager | Report tables, slide charts, copy provenance, brand/template foundations | Data import/validation, polished table library, cross-format generation, output QA, hosted approvals |
| 2 | Campaign rollout: one approved brief into flyer, banner, social sizes, pitch deck and recap | Graphics variants, Event campaign skill, exact-copy checks, templates | One coherent multi-format workflow, batch preview/export, agency/client permissions |
| 3 | Agency proposal: discovery notes and pricing table into branded proposal and presentation | Documents, tables, slides, reusable components | Accurate data bindings, edit-ready PPTX, proposals with polished long-form layout |
| 4 | Research/whitepaper production: supplied manuscript and charts into designed report plus summary slides | Pagination, citations, tables, slide model | Editorial QA, source/citation checks, accessible PDF, long-report typography |
| 5 | Franchise or multi-location marketing: central brand templates with localized approved copy | Exact-copy placement, brand colors/fonts, versioned templates | Hosted scoped access, bulk variants, localization fit and approvals |
| 6 | Regulated or public-sector communications: approved statements into repeated formats with an audit trail | Copy checks, revisions and local audit foundations | Stronger source/data validation, hosted identity/audit and legal review; avoid compliance claims before validation |

The first pilot should focus on **monthly client reporting** if recruiting an agency with recurring reports; otherwise, use **campaign rollout** because the graphics and workflow foundations are further along. The pilot must use real, authorized client assets and compare Forma output with the agency's existing method. Measure copy/data errors, table defects, time to approved export, manual corrections, and whether a second team member can update the same system without designer help.

## Product capabilities required before selling the reporting brief

1. A polished report kit: editable table styles, KPI cards, chart conventions, type hierarchy, page masters and a visible brand rules panel. Check sample reports at 1, 10 and 20 pages and long tables visually.
2. One versioned agency/client workspace containing brand, approved templates, reusable components, skill, sample inputs, preview tests and publication controls. Hosted identities and row-level policies must enforce access.
3. A simple “new monthly report” flow: upload approved copy and structured data, choose the client, inspect a multi-format preview, resolve missing/overflow/data warnings, then approve and export. Do not silently rewrite copy or invent figures.
4. Verified PDF and PPTX fidelity in target applications, including table editability, fonts, page/slide numbering and update behavior. Add automated render comparisons where practical.
5. Only if a client specifically uses Claude: build and test a Claude-compatible skill package and setup guidance against Claude's documented skill format and Team provisioning. Do not call Forma's current JSON skill export a Claude skill or promise a direct Claude Design connector without a tested integration.

## Positioning to test

“Create one approved client report system, then safely reuse it across reports, decks and campaign assets. Every word and number stays traceable; your team sees what changed before publishing.”

This narrows the audience and the product promise. It is a hypothesis for interviews and pilots, not a proven differentiator or readiness statement.

## Clarified first product: reusable agency templates

The detailed intended flow, including PDF preparation and fit modes, is in [template and reference to finished design](template-to-design-workflow.md).

**October 4 correction:** this is a useful repeat-production path, but it is not Forma's primary value proposition. The [AI-first creation direction](ai-first-design-direction.md) now takes priority: generate new editable concepts from copy/reference/brand, then save a successful result as a reusable template. Template administration follows demonstrated design quality.

The near-term product is Forma's own workflow; external design-platform integrations can come later. An agency designer prepares a template once by marking editable copy slots, image frames, fixed artwork and brand roles. A teammate can then choose that template, choose a client brand, upload a manuscript and optional images, review the generated design, resolve any fit warnings and export. The next job starts from the same approved template and brand versions.

The preparation step matters. An arbitrary flattened screenshot or a design with unmarked text cannot reliably become a fully editable, automatically rebrandable template. Reference-image mode can preserve a background and map bounded areas; the strongest repeatable flow uses a structured Forma template. Brand switching should map semantic roles such as primary, accent, heading, body and logo instead of indiscriminately replacing every matching pixel or color.

Canva already supports [data-driven bulk creation from placeholder elements](https://www.canva.com/help/bulk-create/), while Adobe Express supports [quick text/media replacement](https://helpx.adobe.com/uk/express/web/brands-libraries-projects/create-manage-brands/edit-shared-template.html) and [applying brand fonts/colors across a design](https://helpx.adobe.com/express/web/brands-libraries-projects/create-manage-brands/apply-brand-colors-fonts.html). The agency wedge therefore depends on a measurably simpler **template + client brand + approved manuscript → checked output** journey, especially when copy must be exact and one job needs several formats. Speed and quality are pilot metrics, not promises that every design will be ready in minutes.

**First acceptance test:** prepare one agency-owned structured flyer template and two client brand kits; produce four jobs with different manuscript lengths and images. A teammate who did not build the template should be able to choose a client, upload content, review all copy/overflow/brand changes and export without editing individual layers. Track setup time separately from per-job time, review defects and exported visual quality. Repeat with a second format only after the first passes.
