# BikeShare Project Guide

BikeShare Explorer is a read-only dashboard for historical bike-share trips from Chicago, New York City and Washington. It modernizes the original October 2020 Python CLI while preserving `bikeshare_project.py`.

## Architecture

- `bikeshare_project.py` is the preserved interactive command-line application.
- `backend/bikeshare/data.py` loads and validates the root-level CSV datasets; `analysis.py` filters trips and computes statistics; `api.py` exposes them through FastAPI.
- `frontend/src/` contains the React and TypeScript dashboard, API client, shared UI and Recharts visualizations.
- `compose.yaml` runs the frontend and backend containers. The frontend container serves the Vite build through Nginx and proxies `/api/` to FastAPI. Caddy provides the external HTTPS reverse proxy.
- `docs/` contains public development and local setup guidance. Private operating procedures are kept under `docs/private/` and excluded from Git.

## Project constraints

- Keep the three historical CSV files at the repository root for backend loading and Docker builds. Treat them as read-only source data; do not regenerate or edit them as part of application work.
- Data covers January–June 2017. Washington does not include gender or birth-year columns. The dashboard reports historical statistics, not live bike availability.
- Preserve the original CLI and the established analysis/API contracts unless a task explicitly authorizes changing them.
- The production stack shares a Docker network and Caddy reverse proxy with other services. Keep application changes scoped to the BikeShare Compose project; shared proxy or host infrastructure changes require explicit authorization.
- The application has no authentication, database, data editing or individual trip-record browsing.
