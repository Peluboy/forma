# Verification record — 0.2.0

## October 1 — Images, shapes and stacking

Production build passed. 21 model/analysis/document tests, 2 backend tests and the full 26-test browser suite passed. Extended graphic-layer tests passed separately after adding PNG export and mobile-control checks. Coverage includes shape/text ordering, lock boundaries, bounded movement, image normalization, unsupported upload recovery, saves, reviews, undo, backup reopening, SVG draw order and PNG rasterization. Mobile and desktop screenshots inspected. Tests used isolated local adapters, not the hosted Supabase deployment.

Date: September 24, 2026. Runtime: Node.js 24.18.0 on macOS. Browser: installed Google Chrome via Playwright. This workspace was not initially a Git repository; no release commit or hosted deployment is claimed.

## Executed checks

- TypeScript client and server checks plus Vite production build.
- Twelve model/analysis tests: copy round trips, repeated/unknown sections, removals, fitting and overflow, imported project validation, strict image decoding, candidate validation, cancellation, actual Tesseract OCR, and mocked OpenAI request/response handling.
- Two backend integration tests with real local HTTP and SQLite: accounts/sessions, CSRF/origin, ownership, stale-version conflict, revision snapshots, immutable reviews, comments/approval/revocation, recovery rotation/session invalidation, deletion, and rejecting local mode on Vercel.
- One embedded PostgreSQL migration test: SQL execution, authenticated owner RLS, denied direct writes, stale-version conflict, immutable snapshots, anonymous capability-based review, invalid status rejection, persistent analysis quota, and cascading project cleanup.
- Eleven browser tests cover account-to-design-to-review, actual OCR region review, PDF input and PDF/ZIP downloads, reusable templates, guest workflows, local persistence, undo/redo, filtering, overflow, file uploads, guided reference replacement, preserved unedited image region, mobile panel navigation, and two-tab conflict recovery without overwriting either version.

The original beta suite passed: 26 tests across the four suites above.

## Paystack follow-up

After adding billing, the production build, two backend tests, two database tests, two billing tests, and all twelve browser tests passed. Together with the unchanged twelve model/analysis tests, coverage totals 30 tests. The new browser journey verifies draft pricing, disabled unconfigured checkout, mobile layout, and sign-in entry. The new database test checks billing secrecy and atomic service-role writes. Billing integration tests use a real local HTTP server/SQLite with mocked Paystack responses; no live or sandbox Paystack payment has been executed. See [billing release gates](billing.md).

Mocking was used for OpenAI protocol/error handling only. Local OCR, HTTP persistence, PostgreSQL rules, and browser exports were executed. Embedded PostgreSQL supplies a test equivalent of Supabase's `auth.uid()`; it does not validate hosted Supabase email, JWT issuance, or PostgREST configuration.

## Not executed against external services

- Live Vercel deployment, domains, preview protection, and serverless cold starts.
- A configured Supabase project's Auth/email delivery and database APIs.
- Live paid OpenAI image analysis and model availability for your account.
- Hosted backups/restores, production alerting, and a real-user pilot.

Those require configured service accounts and are tracked in [testing-release.md](testing-release.md). They must not be described as passing based on local results.

## September 25: customer shell, dashboard and regression follow-up

- Production TypeScript/Vite build passed after the dashboard and account-transition fixes.
- All 19 Playwright browser tests passed. This includes the previous editor/OCR/export/review/conflict flows, five public/account/onboarding journeys and two dashboard journeys.
- All three PGlite database tests passed, including the new owner-only onboarding preferences migration.
- Desktop and mobile dashboard screenshots were inspected; the mobile browser test checks document overflow.
- A failed intermediate run exposed the editor loading screen unmounting registration during account transition. Fixed by retaining the mounted workspace after initial load; the full suite then passed, including recovery-code acknowledgement.
- Dashboard account error/retry responses are mocked. Real guest storage and existing local account journeys run against the application. These checks do not establish hosted Supabase, OpenAI or Paystack readiness.

## September 25: editor redesign

- TypeScript/Vite production build passed.
- `npm run test:e2e -- --config playwright.built.config.ts`: **20 passed** against the compiled frontend, local test runtime and fresh in-memory database.
- Desktop and mobile editor screenshots reviewed. Added keyboard disclosure, safe logo navigation and mobile manuscript checks.
- Fixed stale guest/account save indicators and an account-deletion redirect race exposed by the faster built-app tests.
- Initial production-runtime test attempt confirmed local OCR is disabled there; the final local test harness keeps OCR enabled. No deployed-provider verification is claimed.

## September 26: real Supabase verification

The three migrations were committed to the inspected empty public schema of project `wmnafbjtibairaelyzsi`. `scripts/verify-cloud.ts` created two temporary confirmed accounts, verified password login, called the actual Forma API to save/reload a project and preferences, and verified cross-account denial. Both test accounts were deleted. This bypasses confirmation-email delivery intentionally and does not establish that signup emails, reset links or redirect allowlists work.

OpenAI authenticated model discovery succeeded. Live image inference did not succeed: HTTP 429, `credit_balance_exhausted` / `insufficient_quota`. `OPENAI_VISION_MODEL=gpt-6-sol` is configured, but output quality and performance remain unverified.

## September 26: Gemini integration

Build, 13 model/analysis tests, the existing 20 browser tests, and the new provider-switching browser test passed. The switching test mocks cloud responses; a separate live Gemini image request succeeded with two regions, correct sample headline and 11.8-second elapsed time. Broader design fidelity evaluation and production quota/cost monitoring remain open.

### Gemini temporary-overload fix

- Reproduced the reported error with a synthetic reference: Gemini returned HTTP 503 / UNAVAILABLE due to high demand. A separate minimal request succeeded, confirming current key/model access.
- Corrected misleading key/model guidance. Temporary 5xx failures now retry once after 750 ms within the existing cancellation/deadline; persistent failures explain service unavailability. Quota/access/client errors are not retried. No provider switching occurs automatically.
- Production build and 14 model/analysis tests passed, including transient success, persistent overload, and no retry for quota exhaustion. API restarted. This improves handling; it cannot guarantee Google's service availability.

### Gemini model routing reliability update

- Gemini 3.7 Flash also returned persistent overload; 2.5 Flash rejected generation access. Gemini 3.1 Flash-Lite succeeded on the same synthetic reference in 9.9 seconds, returning two regions and recognizing the expected heading.
- Changed local primary to `gemini-3.1-flash-lite`, with `gemini-3.8-flash` as an optional backup. This is a smoke-tested operational choice, not proof of equivalent design accuracy or guaranteed availability.
- On temporary 500/502/503/504 responses, use the configured backup within the existing two-attempt/55-second limit. A primary overload starts a 60-second in-process cooldown. Results disclose use of a backup model. Requests never silently cross to OpenAI.
- Access errors, invalid requests and quota errors do not trigger fallback. Cancellation remains enforced. Cooldown is per process, not shared across serverless instances.
- Production build and 15 model/analysis tests passed, including fallback routing, cooldown, and no quota retry. Representative customer-reference evaluation remains pending.

### Development outage recovery

- Repeated cloud errors persisted for the user's reference despite successful synthetic Flash-Lite requests (latest synthetic request: HTTP 200 in 6.7 seconds). Availability on a sample does not establish success on the user's image; that exact image has not been inspected.
- Added and enabled `FORMA_LOCAL_ANALYSIS_FALLBACK=true` locally. After transient Gemini 5xx failures exhaust attempts, installed local OCR processes the same normalized image. Result provider is `local` and a visible warning explains the fallback. Review-before-apply remains required.
- This fallback does not run for access/quota errors, cancellation or when local OCR is unavailable. Production/Vercel still disables local OCR; a hosted worker is needed for equivalent production resilience. Slow requests that exhaust the overall deadline can still fail.
- Build passed. An automated test forces Gemini 503 responses and verifies actual OCR recognition, fallback disclosure and no fallback for 403 access denial.
# October 1, 2026 — Versioned design files

- Production build passed; 19 model/analysis/document tests passed.
- New document tests cover legacy/versioned round trips, Unicode copy, all three aspect ratios, reference mappings/covers, unmapped copy retention, independent snapshots and rejection of unsupported changes.
- `tests/design-files.spec.ts` passed against the isolated built-app test server: download, reopen, persistence after reload, dashboard visibility and unsupported-version rejection without replacing the current design.
- No hosted database migration or AI provider call was needed for this change. Runtime schema/renderer migration remains pending.
# October 1, 2026 — Additional text layers

Build, 20 model/analysis/document tests, 2 backend tests and all 24 browser tests passed. Text-layer tests cover input bounds, unique IDs, unsafe style rejection, v2 backup round trips, overflow, persistence, review snapshot data, keyboard movement, undo, locking, removal, SVG export without selection controls and manuscript preservation. Mobile and desktop screenshots were visually inspected. Verification used isolated local adapters; this does not establish hosted deployment verification.
