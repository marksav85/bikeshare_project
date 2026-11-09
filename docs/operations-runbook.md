# BikeShare Explorer Operations Runbook

This public guide covers basic application behavior, local checks and troubleshooting. Production deployment, restoration and rollback require authorized access and follow separately maintained procedures; this document contains no privileged production commands.

## Service overview

BikeShare Explorer presents aggregated statistics from historical bike-share trips in Chicago, New York City and Washington. It is read-only: it has no accounts, data editing, individual trip browsing or live availability information.

The browser loads a static React and TypeScript frontend. Same-origin API requests are forwarded by the frontend web server to a FastAPI backend, which uses pandas to read the historical datasets and calculate results. The production arrangement places an HTTPS reverse proxy in front of the application. The backend is not intended to be accessed directly by browsers.

## Local development

The combined `scripts/dev.sh` launcher starts the local backend and frontend. It requires the project Python environment and frontend dependencies to be installed beforehand. See the [Local Production Guide](local-production.md#combined-local-development) for prerequisites, URLs, startup alternatives, shutdown behavior and port troubleshooting.

## Health and readiness

The API defines separate process-health and dataset-readiness routes. These route definitions do not establish that either endpoint is reachable from the public internet; reachability depends on the environment's proxy configuration.

For a locally running backend, check them with:

```bash
curl -i http://127.0.0.1:8000/api/healthz
curl -i http://127.0.0.1:8000/api/readyz
```

- `GET /api/healthz` returns `200` with `{"status":"ok"}` when the application can answer. It does not inspect or load datasets.
- `GET /api/readyz` checks whether each configured dataset can be opened and has the required header columns. It returns `200` with per-dataset status when all checks pass, or `503` if a dataset is missing, unreadable or has an invalid or absent header. It reads no trip rows and does not prove that every record can be parsed.

## Troubleshooting

- **Dashboard unavailable:** Check the browser's network connection and the application URL. For local development, start both services with the launcher and use the URL Vite prints.
- **API requests fail locally:** Confirm the backend responds at its local health route and that Vite is using its configured API proxy. The local guide describes startup and port checks.
- **Readiness returns `503`:** In a local checkout, confirm the expected CSV inputs are present and readable with the required headers. Do not edit the historical source files as a troubleshooting step.
- **Readiness passes but statistics fail:** Readiness checks headers only. A data-dependent request is needed to exercise CSV parsing; inspect the backend's foreground logs during local development.
- **A local port is occupied:** The backend uses port `8000`; Vite normally uses `5173` and may print another port if that one is busy. Follow the Local Production Guide to identify the listener safely.
- **Production behavior differs:** This guide does not provide host access or production diagnostics. Contact an authorized maintainer and use the separately maintained operating procedures.

## Deployment, recovery and monitoring

Production changes are performed only by authorized maintainers using the current private procedures. Do not infer deployment status from a successful local build or a Git change. No rollback has been recorded as tested; confirm recovery options with the operator before relying on them.

The repository does not configure monitoring or alerting integrations. Host-level monitoring, log retention and escalation arrangements have not been confirmed here.

## Scope and data limitations

The dashboard reports aggregated historical statistics for January through June 2017. Washington's source data does not provide gender or birth-year fields. The API exposes summary and distribution results rather than individual trip records.
