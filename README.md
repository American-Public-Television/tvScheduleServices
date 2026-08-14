# tvScheduleServices

An AWS Lambda function and API Gateway (managed via Terraform) that acts as an authenticated API proxy to the PBS scheduling API for a PBS-affiliate TV station website, plus a React widget that uses it to show TV listings for a program.

## Repo structure

| Directory | Contents |
|---|---|
| `lambda/tvScheduleServices/` | The Lambda function source (`index.js`) that proxies PBS API requests |
| `terraform/` | Infrastructure as code for the Lambda, API Gateway, IAM role, and SSM parameters |
| `widget/` | A React (Vite) single-page widget, embedded via iframe, that looks up TV listings for a program by ZIP code and provider |
| `notes/` | Project planning notes |

## Lambda (`lambda/tvScheduleServices/`)

Accepts requests from allowed origins and proxies them to the PBS API (and a couple of other upstream APIs), pulling auth credentials and endpoint URLs from AWS SSM Parameter Store at runtime.

**Endpoints:**

| Path | Description |
|------|-------------|
| `/schedule/today` | Full day schedule for a station callsign |
| `/schedule/date` | Schedule for a specific date |
| `/schedule/feed` | Schedule filtered by feed/channel ID |
| `/kids/today` | Kids programming schedule for today |
| `/kids/date` | Kids schedule for a specific date |
| `/kids/feed` | Kids schedule filtered by feed ID |
| `/program` | Program details (including upcoming airings) by callsign and `pbs_id` |
| `/episode` | Episode details by callsign and episode ID |
| `/stations` | Station info by station ID |
| `/search/callsign` | Search programs by callsign and keyword |
| `/search/upcoming_keyword` | Search upcoming programs by keyword |
| `/search/upcoming_kids` | Search upcoming kids programs |
| `/search/cid_keyword` | Search by content ID and keyword |
| `/search/upcoming_cid_keyword` | Search upcoming by content ID and keyword |
| `/search/siblings` | Find related programs for a callsign |
| `/search/kids` | Search kids content by keyword |
| `/zip-from-ip` | Resolve a ZIP code from the caller's IP |
| `/callsign-from-zip` | Look up station callsigns for a ZIP code |
| `/provider` | Get cable/satellite/broadcast providers (headends) for a callsign and ZIP |
| `/host-show` | Find shows associated with a host name (internal CreateTV API) |
| `/tvss/nola-to-pbs-id/{nola_code}` | GET-only. Resolves a program's NOLA code to its `pbs_id`, via a separate internal API Gateway (not PBS's) |

All routes are served through a single catch-all API Gateway `{proxy+}` resource, so adding a new route only requires a change in `index.js` — no Terraform changes needed.

CORS is enforced against `ALLOWED_ORIGINS`, and `OPTIONS` preflight requests are short-circuited with a 200 before any route-specific logic runs.

### Configuration

All secrets and endpoint URLs are stored in AWS SSM Parameter Store. The function reads its SSM path from the `SSM_STORE` environment variable (`/tvss/.env-production`). The PBS API auth token is stored separately at `/tvss/PBS_AUTH` and sent as the `X-PBSAUTH` header on every `pbs_endpoints` call.

Required SSM parameter (JSON object at `SSM_STORE`):
- `widget_endpoints` — endpoints specific to the widget (currently `NOLA_ENDPOINT`, the other API Gateway used to resolve NOLA codes)
- `pbs_endpoints` — PBS API base URLs
- `createtv_endpoints` — internal CreateTV API URLs (used by `/host-show`)
- `ALLOWED_ORIGINS` — list of permitted CORS origins

A reference copy of this JSON lives in the repo-root `.env.production` (gitignored, not the live source of truth — see Deployment below).

### Deployment

From `lambda/tvScheduleServices/`:

```
npm run deploy
```

Zips the source, pushes it via `aws lambda update-function-code`, updates the `SSM_STORE` env var, publishes a new version, and points the `prod` alias at it. This updates the Lambda's code directly and does not touch Terraform state or the SSM config value — use `terraform apply` (below) to push SSM config changes (like `ALLOWED_ORIGINS`) live.

`npm run package` just zips the source into `deployment.zip` without deploying anywhere.

## Terraform (`terraform/`)

Manages the Lambda function, its IAM role, the API Gateway (REST API with a single `{proxy+}` catch-all route to the Lambda), and the two SSM parameters (`/tvss/PBS_AUTH` and `/tvss/.env-production`).

Copy `terraform.tfvars.example` to `terraform.tfvars` (gitignored) and fill in `pbs_auth_token` and `ssm_config`, then:

```
terraform plan
terraform apply
```

`terraform apply` will also pick up any drift in the Lambda's source code (its hash is computed from `lambda/tvScheduleServices/` at plan time), so running it after `npm run deploy` is a no-op for the code itself.

## Widget (`widget/`)

A plain-JS React app (Vite, no TypeScript) meant to be embedded via iframe on PBS-affiliate station sites. It shows upcoming airings for a single hardcoded program (`pbs_id = '7840'`, temporary until the NOLA-to-pbs_id lookup is wired up end-to-end).

**Flow:**
1. Resolve a ZIP code — from a cookie (`tvss_zip`) if present, otherwise via `/zip-from-ip`. The user can always override it.
2. Resolve every station callsign serving that ZIP via `/callsign-from-zip` (a ZIP can be served by more than one PBS station, e.g. WGBH and WSBE for the same market).
3. Fetch the provider (headend) list for the ZIP via `/provider`, and fetch `/program` for each resolved callsign in parallel.
4. Once a provider is picked (persisted to the `tvss_provider` cookie), the ZIP/provider inputs collapse into a `{zip} | {provider} Change` summary line.
5. Listings are grouped by date, filterable by station via a "Channel" dropdown, and show the channel number from the selected provider's lineup (falling back to the over-the-air channel if that provider doesn't carry the feed).

**Structure:**
- `src/App.jsx` — the whole widget UI and data flow
- `src/lib/api.js` — fetch wrappers around the Lambda endpoints (base URL from `VITE_API_BASE_URL`)
- `src/lib/cookies.js` — minimal cookie get/set helpers
- `src/lib/format.js` — date/time/channel formatting helpers

**Local development:**

```
cd widget
npm install
npm run dev
```

Requires a `.env` with `VITE_API_BASE_URL` pointing at the deployed API Gateway URL, and `http://localhost:5173` present in the Lambda's live `ALLOWED_ORIGINS` (already the case as of this writing).

`npm run build` produces a static `dist/` to host and point an iframe at.
