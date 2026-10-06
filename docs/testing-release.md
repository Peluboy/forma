# Testing and release gates

## Local verification

Use Node 24 and install the lockfile with `npm ci`. Run `npm test`, `npm run test:backend`, `npm run test:db`, `npm run build`, and `npm run test:e2e`. Install Chromium with `npx playwright install --with-deps chromium` for a Linux CI runner. Run `npm run setup:ocr` before the actual OCR fixture test. Browser tests should exercise real local services, not mock successful persistence or AI responses. The local OCR fixture should run against actual OCR assets. A mocked OpenAI response validates parsing only; it is not a paid-provider smoke test.

Required regression coverage:

- Manuscript aliases, repeated fields, unknown labels, removed sections, and no-label fallback.
- Overflow and unmapped-field export gates; PNG/SVG/PDF/ZIP downloads.
- Project import validation, local persistence, undo/redo, and saved-template reuse.
- Owner isolation, unauthenticated rejection, write protection, version conflict, revisions, review expiry/revocation.
- Account creation/login/logout/recovery for the local adapter.
- Reference upload, manual mapping, OCR proposal review, and untouched-artwork checks.
- Responsive workspace and keyboard-accessible basic workflows.

## External release checklist — must be executed on the target deployment

- [ ] Vercel build/function deploy succeeds with Node 24 and correct API/SPA rewrites.
- [ ] `/api/config` reports Supabase mode and contains no secret credentials.
- [ ] Supabase migration applies cleanly to an empty staging project.
- [ ] Two real Supabase accounts cannot access each other's records, including direct REST/RPC calls.
- [ ] Stale concurrent save receives 409 and does not overwrite newer content.
- [ ] Signup confirmation, password reset, and configured redirects work through real email delivery.
- [ ] Private-beta access restrictions are verified with an uninvited account.
- [ ] One permitted OpenAI image-analysis request succeeds and its cost/latency is recorded.
- [ ] Missing/invalid OpenAI credentials produce a usable error; manual mapping still works.
- [ ] Create, comment on, approve, expire, and revoke a review link in separate browsers.
- [ ] Exports open in external viewers and contain the intended copy.
- [ ] A backup restores into an isolated staging database with ownership and review expiry intact.
- [ ] Retention/contact/privacy text is approved by the operator.
- [ ] Production error monitoring and provider spend alerts are enabled.

This checklist is intentionally unchecked until executed. Local passing tests do not establish any of these hosted outcomes. Do not mark the product “deployed,” “production verified,” or “email connected” based solely on supplied code.

## Release record

Record commit identifier, Node version, exact commands, test totals, browser/device coverage, migration identifier, deployment URL, and remaining limitations in the handoff. The build should be reproducible from the lockfile. If any external dependency is unavailable, state the missing configuration rather than substituting simulated results.

The embedded PostgreSQL suite executes the Supabase migration with equivalent `auth.uid()` test settings. It validates RLS isolation, restricted direct writes, atomic version checks, immutable review snapshots, public review actions, quotas, and cascade cleanup. It does not replace a live Supabase Auth/PostgREST/email integration test.

## Paid release gates

Run `npm run test:billing` in addition to the original checks. Complete [Paystack test and live gates](billing.md#verification-and-release-gates) and the [production-readiness assessment](production-readiness.md) before a paid public release.

## Isolated built-app browser verification

After `npm run build`, run `npm run test:e2e -- --config playwright.built.config.ts`. This serves the compiled frontend bundle on port 5181 with the local adapter and a fresh in-memory database. It does not reuse or mutate the user's development database. OCR remains enabled in the local test runtime; this is not a hosted-production runtime check. The normal Playwright configuration remains available for development-server checks. This built-app suite does not verify hosted Supabase or real payments.
