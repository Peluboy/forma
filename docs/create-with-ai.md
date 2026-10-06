# Create with AI: current product flow

Updated October 4, 2026. This guide describes the implemented beta behavior, not the finished-design quality target in the [AI-first direction](ai-first-design-direction.md).

## For a designer or business owner

1. Open **Create with AI** from the homepage or dashboard. Choose **Graphics**, **Documents**, or **Slides**. Graphics offer portrait, square, story and banner sizes.
2. Paste the approved manuscript, or upload TXT, Markdown, DOCX or a text-based PDF. Optionally add a PNG/JPG/WebP visual reference. When a reference is present, choose how closely to follow it. If a saved brand is available, keep **Use brand colors and fonts** selected.
3. Select **Create three directions**. Guests can prepare the form, then sign in; the draft is kept through the login step. The request sends the manuscript and any reference to Google Gemini for art-direction planning. The model chooses visual metadata only; Forma maps the original manuscript into editable source.
4. Compare the three previews. Choose **Open and review**. Check the **Issues** panel for copy/fit problems, make edits in the editor, and export from the editor when satisfied. Save a successful project as a reusable template if needed.

Current graphics use curated artwork with different compositions, colors and typography. Documents use flowing pages; slides use the presentation model. A direction may still need manual layout work. The app does not yet generate new photos/illustrations, guarantee reference fidelity, repair every collision or produce a client-ready report/deck without review.

## For an operator or developer

- Configure server-only `GEMINI_API_KEY` and `GEMINI_VISION_MODEL`; no `VITE_` provider key is needed. The route is `POST /api/design/concepts` and requires an authenticated user. It enforces a 30,000-character manuscript, bounded reference data, 10 requests per user per hour, shared concurrency of two and the existing analysis/billing quota checks.
- `server/creative.ts` sends a bounded JSON plan request and retries one transient transport/server failure. The adapter validates the image, model output, colors, font names, template IDs and three distinct directions. It never returns model-authored copy fields. Provider failures return plain error messages without exposing credentials.
- `src/domain/design/creativeDesign.ts` converts the plan into a `Project`; the original manuscript is stored intact. `src/features/create/` renders the form and previews, and a one-time session handoff opens the chosen project in the editor. `features/editor/lib/startIntent.ts` consumes that handoff after project storage initializes.
- Run `npm run lint`, `npm run build`, `npm test`, `npm run test:backend` and the focused Playwright create/dashboard/editor-context journeys after changing this flow. The live Gemini smoke test so far covers one short no-reference document brief. Use real authorized briefs and visual review before making speed or quality claims.
