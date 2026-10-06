# Deployment and operations

## Local development

Use Node.js **24.x**. The local adapter uses built-in `node:sqlite`; older Node versions are unsupported. From the repository root:

```sh
npm ci
cp .env.example .env
```

Run `npm run dev` to start both services. Use `npm run dev:web` or `npm run dev:api` to start one service. Run `npm run setup:ocr` once to install the English OCR asset. `npm run build` creates the production frontend; `npm start` serves it with the API in a local production preview.

Keep `FORMA_MODE=local`, set `APP_ORIGIN=http://127.0.0.1:5173`, and use the repository's API and frontend development scripts. The API listens on `127.0.0.1:8787`; Vite serves the frontend and proxies `/api`. The `.env` must be loaded into the server process by its startup script. Local SQLite defaults to `.data/forma.sqlite`. Do not commit `.env`, the database, or downloaded OCR data.

Manual reference mapping needs no provider credentials. Local OCR additionally needs the English language asset installed through the repository OCR setup script. Production does not offer local OCR. Local registration displays a recovery code; it does not send email. Export a project JSON before experimenting with database replacement.

## Production prerequisites

Create a Supabase project and a Vercel project linked to this repository. Select the Forma directory as Vercel's Root Directory if this is a monorepo. Use Node 24.x, `npm ci`, `npm run build`, and output directory `dist`. The supplied `vercel.json` routes `/api/*` to `api/index.ts` and other app paths to the SPA; the API has a 60-second function budget.

Vercel documents Node 24.x support and package `engines.node` overrides. Deployment packaging and routing still require a real preview smoke test. [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [configuration reference](https://vercel.com/docs/project-configuration/vercel-json)

### Database and identity

1. Inspect the target database using `supabase/inspect.sql` and confirm staging/production before changing it. Apply the three migration files in timestamp order: `202609240001_forma.sql`, `202609240002_billing.sql`, and `202609240003_preferences.sql`. Start in staging, then production after testing. Check existing tables, policies and functions for conflicts; these scripts must not be blindly rerun. Keep a migration history.
2. Verify `forma_records` row-level security and the `forma_save`, `forma_remove`, and `forma_review` RPC permissions with two distinct users. Owner checks must also work through direct Supabase calls.
3. In Supabase Authentication, configure the Site URL and allowed redirect URLs to your exact deployment domain. Add a dedicated staging domain if used. Avoid broad production wildcards.
4. Configure confirmation/reset email delivery and test it. For a private beta, restrict new signups and invite/provision participants deliberately; a free account form alone is not an access gate.
5. Set a suitable password policy and review available abuse protection in the Supabase dashboard.

Redirect allowlists control where confirmation and reset flows may return. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls). Authentication/email behavior is externally unverified until tested against your project.

### Environment values

| Variable | Production value / purpose |
|---|---|
| `FORMA_MODE` | `supabase`; required deployment mode |
| `APP_ORIGIN` | Exact public origin, for example `https://forma.example.com`, without trailing slash |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key, authorized via RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only secret enabling cloud account deletion; omit if deletion is operator-managed |
| `OPENAI_API_KEY` | Optional server-only secret for paid analysis |
| `OPENAI_VISION_MODEL` | An account-accessible image-input model supporting structured Responses output |
| `FORMA_DB_PATH` | Local only; never a production persistence strategy |
| `OCR_LANG_PATH` | Local only; defaults to `.data/tessdata` |
| `PORT` | Local API port; defaults to 8787 |

Ordinary application operations do not need a Supabase service-role key. The optional deletion endpoint requires it. Never add one to the browser or public `/api/config`. Configure production and preview values separately; do not let previews share production data unintentionally. Set `APP_ORIGIN` to the actual preview origin for tests, or use a stable staging domain. Environment changes require a new deployment.

### OpenAI

Use a project-specific server key and budget controls. Set both OpenAI variables to enable the option; leave both empty to keep it unavailable. The implementation uses the Responses API with image input, structured JSON output, and `store:false`. That request option is not a promise of zero provider retention. Inspect actual provider terms and your account settings before handling sensitive uploads. A model name alone does not prove access or capability: run one authorized smoke request before release.

## Smoke test and promotion

After deploying, fetch `/api/health` and `/api/config`, then use the full release checklist. Health reports app initialization, not a database round-trip. Create a real account, save and reload a project, test owner isolation/conflicts, create a review, open it in a separate browser, export, and revoke the link. Check function logs for errors without logging document bodies. Promote only after these pass. No deployment URL or credentials are supplied by this repository.

## Backup and restore

**Portable design backups:** export `.forma.json` files. Reopen one in a fresh browser and confirm image/text render correctly. These back up a design, not accounts, review comments, or full revision history.

**Local database:** stop the API cleanly, then copy the SQLite database and any remaining `-wal`/`-shm` siblings as a consistent stopped set to protected storage. Restore into a separate directory, point `FORMA_DB_PATH` at it, start local mode, and test login/project/review access. Never copy only a live WAL-mode database file and assume it is complete.

**Supabase:** choose a backup mechanism and retention appropriate to your plan; do not assume free-tier managed backups are sufficient. Supabase documents platform backups and recommends independent exports where needed. Include application data and required Auth identities in a tested recovery strategy; application rows alone cannot restore user accounts. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)

Restore first to an isolated project using Supabase's documented restore procedure. Verify row counts, identities, RLS policies, functions, ownership, revision counts, and review expiration. Point a staging deployment at the restored project and execute account/save/review journeys. Record recovery duration and data-loss window. Keep production disabled or read-only during a controlled cutover and avoid mixing old/new writes. Backups contain manuscripts, images, password/session data in local mode, and review tokens; restrict access and retention.

## Operations and rollback

Monitor 5xx/429 rates, save conflicts, function latency, database growth, and AI spend. Images are embedded in snapshots, so every revision can increase storage substantially. There is no claim of automated cleanup or globally enforced AI quotas. Begin with a small beta cohort.

For frontend/API regression, roll back to a known tested Vercel deployment whose code remains compatible with the current schema. Do not reverse a database migration blindly; back up first and prefer a forward fix. For leaked review links, revoke them. For a provider outage, disable that provider while manual editing remains available. For account deletion in cloud mode, follow the documented administrative procedure and verify dependent records are removed.

## Optional paid subscriptions

Apply `202609240002_billing.sql` after the original migration. Configure server-only Paystack credentials and service-role access following [the billing deployment guide](billing.md). Payments remain closed with `FORMA_BILLING_ENABLED=false`. Never activate live checkout before the billing release checks pass.

## Connecting the supplied project

Project reference: `wmnafbjtibairaelyzsi`. Connection work is tracked in [PROGRESS.md](PROGRESS.md). The successful public-key check is not a database migration or proof that cloud persistence works.

1. Confirm whether this is staging or production. Rotate privileged credentials previously shared outside secret storage.
2. In the ignored local `.env`, set `SUPABASE_DB_URL` to the database connection URI from Supabase’s Connect dialog. Use a reachable direct or session-pooler connection with TLS. Set `SUPABASE_SERVICE_ROLE_KEY` to the rotated server credential for server-only deletion/billing. Do not put either value in a `VITE_` variable or documentation.
3. Run `npm run inspect:supabase` (requires `psql`) to inspect catalogs using `supabase/inspect.sql`, then apply only missing compatible migrations. No database reset is needed or authorized by this setup procedure.
4. For local confirmation/reset testing, configure Auth redirect allowlists for `http://127.0.0.1:5173/auth/callback` and `http://127.0.0.1:5173/reset-password`. Set the Site URL appropriately for the chosen environment; do not replace a production Site URL with localhost.
5. Run `npm run check:supabase`. Private table permission denial can be expected for anonymous access; inspect grants and verify authenticated access separately.
6. Once schema/configuration are ready, set `FORMA_MODE=supabase`, restart the API, and verify signup, email confirmation, login, preferences and a project save/reload with two isolated test accounts. Verify neither user can access the other's projects. Test expiry/recovery and account deletion separately.
7. Local SQLite accounts/projects are not automatically moved into Supabase. Keep the local database and portable project exports until an explicit migration/import is verified.

## Gemini analysis provider

Set `GEMINI_API_KEY` and `GEMINI_VISION_MODEL=gemini-3.8-flash` in server environment variables and restart/redeploy the API. Neither value needs a browser `VITE_` variable; the key must never be exposed to the client. Available provider booleans are returned in session capabilities. Configured Gemini is selected initially, followed by OpenAI, then local OCR; users can explicitly change provider in the Reference panel. Errors do not silently forward images to another provider.

Google's free-tier availability and quotas depend on the project. The UI discloses its data-use implications. Review Google AI Studio billing/usage before using real confidential client material. Model discovery and one successful test do not prove unrestricted free quota. Sources: https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash

Gemini reliability configuration: current local primary is `gemini-3.1-flash-lite`. Optional `GEMINI_FALLBACK_MODEL=gemini-3.8-flash` enables same-provider failover on transient 5xx errors, with a 60-second process-local primary cooldown. Clearing the fallback variable restores the single-model retry. No fallback occurs for 429, authentication or client errors. Both models remain subject to Google availability and project quotas.

For local development with installed OCR assets, `FORMA_LOCAL_ANALYSIS_FALLBACK=true` enables disclosed OCR recovery after transient Gemini server failures. Default is false. This does not enable OCR on Vercel/production or bypass provider quota/access failures.
