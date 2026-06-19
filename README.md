# tvScheduleServices

An AWS Lambda function and API Gateway (managed via Terraform) that acts as an authenticated API proxy to the PBS scheduling API for a PBS-affiliate TV station website. Handles PBS API authentication, CORS enforcement, and routing.

## What it does

Accepts POST requests from allowed origins and proxies them to the PBS API, pulling auth credentials and endpoint URLs from AWS SSM Parameter Store at runtime.

**Endpoints:**

| Path | Description |
|------|-------------|
| `/schedule/today` | Full day schedule for a station callsign |
| `/schedule/date` | Schedule for a specific date |
| `/schedule/feed` | Schedule filtered by feed/channel ID |
| `/kids/today` | Kids programming schedule for today |
| `/kids/date` | Kids schedule for a specific date |
| `/kids/feed` | Kids schedule filtered by feed ID |
| `/program` | Program details by callsign and program ID |
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
| `/provider` | Get cable/satellite providers for a callsign and ZIP |
| `/host-show` | Find shows associated with a host name |

## Configuration

All secrets and endpoint URLs are stored in AWS SSM Parameter Store. The function reads its SSM path from the `SSM_STORE` environment variable. The PBS API auth token is stored separately at `/tvss/PBS_AUTH`.

Required SSM parameter (JSON object at `SSM_STORE`):
- `pbs_endpoints` — PBS API base URLs
- `createtv_endpoints` — internal API URLs (used by `/host-show`)
- `ALLOWED_ORIGINS` — list of permitted CORS origins

## Deployment

The function is packaged as a zip and deployed via Terraform. The `terraform/dist/` directory holds the build artifact.
