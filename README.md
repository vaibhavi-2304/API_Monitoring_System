# API Monitoring Dashboard

A fresher-friendly API monitoring project built with HTML, CSS, vanilla JavaScript, Node.js, Express, MongoDB, and Mongoose. The frontend and backend are separate folders; Express serves the frontend at `http://localhost:5000`.

## Features

- Manual HTTP GET checks with response-time measurement, status code, timeout handling, and network error recording.
- Optional JSON response validation for manual checks.
- Scheduled background checks using `node-cron`; each monitor has a configurable interval from 1 minute to 24 hours.
- Monitor management: add, edit URL/rules, pause, resume, and delete.
- Per-monitor expected HTTP status and slow-response threshold.
- MongoDB check history with timestamps, source (manual/scheduled), status, latency, and error details.
- Dashboard statistics: total/successful/failed checks, average response time, active monitors, and scheduled-check success rate for the last 7 days.
- Recent failure/incident list and consecutive-failure tracking.
- Optional email alerts after two consecutive scheduled failures, rate-limited to one alert per monitor per 30 minutes.
- Filter history by status, source, and URL; export visible history to CSV or export a monitor's full recent history from its action.
- Timeout support and public-URL validation to reduce server-side request forgery risk.

## Requirements

- Node.js 18 or newer
- MongoDB running locally or a MongoDB connection string

## Run locally

1. Extract the ZIP.
2. Open a terminal in `api-monitoring-dashboard/backend`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and set `MONGO_URI`.
5. Start the app:
   ```bash
   npm start
   ```
6. Open `http://localhost:5000`.

The backend must remain running for scheduled monitoring. The dashboard refreshes its display every 30 seconds; the backend scheduler checks due monitors once per minute and uses each monitor's interval to determine when it is due. Checks run in the backend, not in the browser.

## Optional email alerts

Dashboard incident history works without email configuration. To enable email, fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL_FROM`, and `ALERT_EMAIL_TO` in `.env`. Use credentials for an SMTP account you control. Never commit `.env` or real credentials.

## Important behavior

- Manual checks consider any 2xx response healthy unless JSON validation is enabled and fails.
- Scheduled monitors use the configured expected status code (default 200). If the response does not match, or the configured latency threshold is exceeded, the check is marked DOWN.
- The displayed scheduled success rate is calculated from recorded scheduled checks across all monitors in the last seven days; it is not a time-weighted SLA and is not an individual per-monitor uptime guarantee.
- Each check uses GET. The project does not currently configure POST bodies or API authentication headers.
- Public HTTP/HTTPS URLs are accepted. Localhost and private network destinations are blocked by URL validation, so don't use this hosted-style monitor to probe private systems.
- This is an educational starter project. For production use, add authentication/authorization, rate limits, robust DNS-rebinding protections, and a persistent job queue or distributed scheduler if running multiple backend instances.
