# AI-first design creation

Product correction · October 4, 2026. The first cross-format planning flow is implemented; the outcome and acceptance plan below are broader than current behavior. The [status ledger](STATUS.md) records what works now.

## Why the current flow is insufficient

The saved-template job only replaces manuscript copy and can expand text into unused vertical space. That helps an agency repeat an approved layout, but it does not remove concept development or much manual design work. A customer can already request an original flyer or edit a reference through [ChatGPT Images](https://help.openai.com/en/articles/11084440-images-in-chatgpt), use [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) for decks and one-pagers, or use [Canva AI with Brand Kits](https://www.canva.com/solutions/brand-management-tools/). The beta must beat these options on the complete job, not on text replacement alone.

## Primary promise to test

“Upload approved words, an optional visual reference, and a brand. Get several distinct, editable, production-ready design directions in minutes, with every word and number checked.”

This is a hypothesis. “In minutes”, “production-ready” and “better than chat” require measured pilots and output review. Graphics, documents and slides are all part of the product from the first creation screen. Arbitrary pixel-perfect copying is not the goal.

## The customer flow

1. Choose **Make a design**. Paste or upload the manuscript. Add a reference image/PDF, brand assets and supplied photos if available.
2. Make a few plain-language choices: output size, **Follow closely / Keep the style / Explore new ideas**, imagery source, and whether the design may add decorative elements. Exact copy is locked by default.
3. Forma produces three genuinely different composition proposals using the source's style as a guide where requested. Each proposal contains editable text, geometry, colors, imagery and a concise explanation of what changed. A prepared template can be selected as a strong starting constraint, but it is not required.
4. Forma checks exact text/data coverage, minimum readable size, overlap, clipping, contrast, brand rules and image rights/source. Failures trigger an automatic bounded repair attempt or a clear choice such as adding a page; no silent paraphrase or invented facts.
5. The user selects a direction, makes simple direct edits, previews target sizes, then exports editable source and final outputs. Save a successful direction as a reusable template for repeat work.

## Creation architecture

Use AI as an **art director and visual asset maker**, not as the final authority on approved words. A vision/planning model inspects the reference and returns a bounded, validated design plan: art direction, visual hierarchy, positions, font roles, colors, proposed image subjects/crops and allowed variations. An image model can create text-free backgrounds or illustrations when the user opts in; supplied imagery should remain usable. The deterministic renderer places the exact manuscript as editable text on top. The model may suggest copy edits only in a separate, unapproved proposal.

The plan needs a versioned schema and guardrails rather than one long free-form prompt. Keep the original manuscript/reference immutable; record model/provider, source references, selected choices and every accepted change. Before rendering, validate IDs, geometry, asset sizes, allowed fonts/colors and text coverage. After rendering, measure glyph fit and collisions from the actual output, not only the model's self-assessment. Retry a bounded repair with precise failure data; if still failing, show the user the unresolved issue and retain an editable draft.

Image generation alone is insufficient because generated lettering can drift and layout-sensitive composition is still imperfect; [OpenAI's image API guide](https://developers.openai.com/api/docs/guides/image-generation) notes difficulty with precise placement in structured compositions. Google documents [Gemini image generation and editing](https://ai.google.dev/gemini-api/docs/image-generation), but provider access, latency, quotas, cost and quality must be measured with Forma's actual reference/manuscript pairs. No provider should be represented as a guaranteed free production service.

## Why someone would choose Forma

The differentiator to test is a **reliable finished deliverable**, not generic AI image generation: exact approved text and data, brand-controlled editable layers, intentional variations, automatic fit/contrast checks, quick multi-size output, and repeatable agency workflows. General AI tools may close these gaps; the claim survives only if user tests show fewer manual fixes and faster approved exports on representative jobs.

## Implemented first slice and exit gate

The `/create` route accepts an approved manuscript, an optional PNG/JPG/WebP reference, an optional saved brand, and a choice of **graphics, documents or slides**. Sign-in is required to call Gemini; a guest's form is kept through the sign-in step. Gemini returns three bounded visual plans. Forma builds editable projects from them and preserves the manuscript in source. The graphics path applies differing typography, palette and composition to the existing artwork vocabulary. Unit tests cover source preservation for all three families, and browser journeys cover signed-in creation and the guest gate.

This is an art-direction prototype, not the promised finished-design engine. The graphics artwork still comes from curated Forma templates; document pagination and slide layouts vary far less than the concept labels imply. There is no generated imagery, full reference reconstruction, automatic visual collision repair, or independent quality score. The next gate is to make each family produce genuinely distinct, content-aware composition and asset treatments, then measure time to an approved export on real briefs.

Evaluate at least ten authorized briefs: short, medium and long copy; image and no-image jobs; several reference styles. Compare against a person using ChatGPT/Claude/Gemini and the existing Forma template flow. Record time to first usable design, time to approved export, wording/data defects, manual interventions, visual quality judged blind by designers and non-designers, and whether the source remains editable. Do not expand to reports or team marketplaces until this slice consistently saves meaningful work.
