# API reference

All application routes use `/api`. JSON requests use `Content-Type: application/json`. Errors return `{ "error": "human-readable message", "code": "optional_machine_code" }`. Codes include 400 validation, 401 authentication, 403 write protection, 404 unavailable/not owned, 409 version conflict, 413 body too large, 429 throttling, and 5xx service/configuration failure. Do not depend on exact human-readable wording.

## Authentication

In **Supabase mode**, sign up, sign in, sign out, and request/reset passwords through Supabase Auth. Send `Authorization: Bearer <access_token>` to authenticated API routes. `/api/auth/*` local adapter endpoints are deliberately unavailable in this mode. Ordinary owner operations do not require a service-role credential; optional cloud account deletion requires a server-only service-role key.

In **local mode**, the server issues an HttpOnly `forma_session` cookie. Retrieve the session's CSRF token from `/api/session`; authenticated writes require `X-CSRF-Token`. Auth writes and review writes are also subject to origin checks. Local session expiry is seven days. Passwords must contain 12–128 characters. Recovery uses the one-time code displayed at registration and rotates it after recovery; there is no local email delivery.

| Method and path | Request | Response / purpose |
|---|---|---|
| GET `/health` | None | `{ok,mode}`; process health, not a database connectivity test |
| GET `/config` | None | `{mode,supabaseUrl,supabaseAnonKey}`; public config only |
| GET `/session` | Optional authentication | `{user,csrfToken,capabilities}`; nullable user |
| POST `/auth/register` | `{name,email,password}` | Local only: `{user,csrfToken,recoveryCode}` |
| POST `/auth/login` | `{email,password}` | Local only: `{user,csrfToken}` |
| POST `/auth/logout` | `{}` | Local authenticated: `{ok:true}` |
| POST `/auth/recover` | `{email,recoveryCode,password}` | Local only: rotated `{recoveryCode}`; old sessions revoked |
| DELETE `/account` | None | Local account/data deletion; cloud requires optional server-only service-role configuration |

User is `{id,name,email}`. The API limit for JSON bodies is 4 MB; individual image/project validation is stricter.

## Owner resources

| Method and path | Request | Response |
|---|---|---|
| GET `/projects` | None | `{projects:[{project,version}]}` |
| GET `/projects/:id` | None | `{project,version}` or 404 for unavailable project |
| PUT `/projects/:id` | `{project,expectedVersion}` | `{project,version}`; 0 creates, stale version returns 409 |
| DELETE `/projects/:id` | None | `{ok:true}`; removes dependent revisions and reviews |
| GET `/projects/:id/revisions` | None | `{revisions:[{id,version,createdAt,name}]}` |
| GET `/projects/:id/revisions/:revisionId` | None | `{project,version}` snapshot |
| GET `/brand` | None | `{name,primary,secondary}` |
| PUT `/brand` | `{name,primary,secondary}` | Saved brand; six-digit hex colors |
| POST `/projects/:id/reviews` | `{expiresInDays:7, requireAuthenticatedApproval?, workspaceId?}` | `{token,url,expiresAt,requireAuthenticatedApproval}`; allowed duration 1–30 days |
| GET `/projects/:id/reviews` | None | `{reviews:[{token,url,expiresAt,status,requireAuthenticatedApproval,decision}]}` |
| DELETE `/projects/:id/reviews/:token` | None | `{ok:true}` |

## Team workspaces (local account mode)

Available when `FORMA_MODE=local`. Supabase mode returns `501` until membership RLS lands.

| Method and path | Request | Response |
|---|---|---|
| GET `/workspaces` | None | `{workspaces:[Workspace & {myRole}]}` for the caller’s memberships |
| POST `/workspaces` | `{name}` | `{workspace,myRole:"owner"}` |
| GET `/workspaces/:id` | None | `{workspace,myRole,membership}` or 403 if not a member |
| POST `/workspaces/:id/members` | `{email,role}` | `{workspace}`; owner only; role ≠ owner |
| DELETE `/workspaces/:id/members/:userId` | None | `{workspace}`; owner only; cannot remove owner |
| POST `/workspaces/:id/publish` | `{kind,sourceId,pinnedVersion,name,snapshot}` | `{publication}`; editor+; source must be owned when applicable |
| GET `/workspaces/:id/publications` | None | `{publications:[]}` for members |
| GET `/workspaces/:id/audit` | None | `{audit:[],recovery:{memberships:[]}}`; editor+ |

Roles: `owner` > `editor` > `reviewer` > `viewer`. Publish requires editor+; approve requires reviewer+; manage members requires owner.

A revision records each successful project save. Restoring means reading a revision and saving its document against the current project's latest version. There is no blind restore endpoint. Review creation uses an already-saved snapshot. Returned review URLs are relative `/review/<token>` paths.

## Public review capability

| Method and path | Request | Result |
|---|---|---|
| GET `/reviews/:token` | None | Snapshot with project, status, comments, expiresAt, optional requireAuthenticatedApproval/decision |
| POST `/reviews/:token/comments` | `{author,body}` | Updated review; name up to 80 characters, comment up to 2000 |
| POST `/reviews/:token/status` | `{author,status}` | Updated review; status `approved` or `changes_requested`; rejected when authenticated approval is required |
| POST `/reviews/:token/decision` | Auth + `{status}` | Records signed-in identity on the decision; workspace-scoped reviews also require reviewer+ membership |

A token is authorization for read/comment routes. Self-reported reviewer names remain unverified on legacy public status updates. Authenticated decisions store `{userId,email,name}`. Expired or revoked reviews return unavailable. Reviews are limited to 200 comments. API throttles are per running process and must not be treated as global deployment quotas.

## Reference analysis

POST `/reference/analyze` requires authentication and accepts `{image,provider}` where `image` is a PNG/JPEG/WebP data URL and provider is `local` or `openai`. The image is bounded to 2 MB, 16 megapixels, 8000 pixels per side, and supported aspect ratio; still images only. Production disables local OCR. OpenAI requires both key and model configuration.

Result: `{regions,warnings,provider}`. Each region has `id,text,confidence,box:{x,y,width,height},fontSize,fontFamily,textColor,coverColor,field`. Geometry is normalized to **720 × 900**, so clients must scale the vertical coordinate to the reference canvas height. Fields are `kicker`, `title`, `description`, `date`, `location`, `footer`, or null. Fonts are Arial/Georgia estimates. Up to 60 candidate regions may be returned.

The endpoint sends only the reference image for analysis; manuscript placement remains a client-side deterministic operation. A candidate's OCR text is not approved manuscript copy. Review every proposal. A timeout or provider error is a real error, not an excuse to return invented regions.

## Billing endpoints

See [Paystack billing API and lifecycle](billing.md#endpoints) for `/api/billing` routes, authentication, verification, and configuration.

### Gemini analysis extension

`POST /api/reference/analyze` accepts `provider: "local" | "openai" | "gemini"`. Existing authentication and analysis quotas apply to every provider. Session `capabilities.analysis.gemini` reports server configuration presence, not remaining provider credit. The response retains the same `regions`, `warnings`, and `provider` contract. No API keys are exposed. Gemini errors are sanitized, and responses that are blocked, truncated or invalid cannot be applied as successful analyses.

`POST /api/design/concepts` requires authentication and accepts `{family, manuscript, format, freedom, reference?, brand?}`. `family` is `graphics`, `document` or `presentation`; `format` is `portrait`, `square`, `story` or `banner`; `freedom` is `close`, `style` or `explore`. The manuscript is required and capped at 30,000 characters. The optional reference is a bounded PNG/JPEG/WebP data URL validated by the image decoder. The response is `{concepts:[...]}` with exactly three validated plans containing a name, brief rationale, supported template/composition identifiers, hex colors and supported font families. It does not contain rewritten manuscript copy. The route uses the existing analysis/billing allowance, a per-user hourly rate limit and server-side Gemini configuration. See [Create with AI](create-with-ai.md) for the user journey and quality limits.
