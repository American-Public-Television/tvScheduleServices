# tvScheduleServices

> **Moved 2026-10-21.** The Lambda and its API are managed in `createtv_cms_devsite` (`terraform/tvss.tf`, `lambda/tvScheduleServices/`). This repo keeps only the widget hosting Terraform.

An AWS Lambda function and API Gateway that acts as an authenticated API proxy to the PBS scheduling API for a PBS-affiliate TV station website, plus a React widget that uses it to show TV listings for a program.

## Repo structure

| Directory                    | Contents                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `terraform/`                 | Infrastructure as code for the widget hosting only                                                   |
| `widget/`                    | A React (Vite) single-page widget, embedded via iframe, that looks up TV listings for a program by ZIP code and provider |
| `notes/`                     | Project planning notes                                                                               |

## Lambda

The Lambda code, its deploy script, `tvss-api`, its IAM role and the `/tvss/*` parameters live in `createtv_cms_devsite` since 2026-10-21: code in `lambda/tvScheduleServices/` (deploy with `npm run deploy` there, after asking), Terraform in `terraform/tvss.tf`. The parameter values are set by a person in Parameter Store, never by Terraform. Do not deploy the Lambda from this repo.

The live code matched this repo's `prod` branch. `trunk` also holds an undeployed `/tvss/nola-to-pbs-id/` route; port it from this repo's history if it is wanted.

## Terraform (`terraform/`)

Manages only the widget hosting: the `tvss-widget` bucket, its CloudFront distribution, and the `tvss-github-actions-widget-deploy` role that `apt_web`'s deploy workflow assumes. The trust list is `github_deploy_subjects` in `variables.tf`, matching the live role.

The Lambda, `tvss-api`, the Lambda's IAM role and the `/tvss/*` parameters moved to `createtv_cms_devsite` (`terraform/tvss.tf`) on 2026-10-21. `tvss_removed.tf` dropped them from this state without destroying them. Never apply them from here.

State is local (`terraform/terraform.tfstate`). `terraform.tfvars` no longer needs `pbs_auth_token` or `ssm_config`; remove those values from it.

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