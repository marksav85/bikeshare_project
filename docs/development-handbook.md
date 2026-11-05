# BikeShare Explorer Development Handbook

**Audience:** Project owner and developers maintaining BikeShare Explorer  
**Purpose:** Record the implemented architecture, development workflow and constraints that matter when extending the application.

## Project context and scope

BikeShare began as the October 2020 interactive Python command-line project in `bikeshare_project.py`. It loads historical trip records for Chicago, New York City and Washington and calculates travel-time, station, duration and rider statistics. The modernization kept that CLI and its analytical purpose, extracted reusable pandas code, exposed it through FastAPI, and added a React dashboard for interactive filtering and visual exploration.

The web application is read-only. It has no accounts, database, data editing, individual-trip browsing or live bike availability. The dashboard describes a historical January–June 2017 sample. Each city dataset contains about 300,000 records.

## Implemented features

- Select one of three cities, then choose an available month and weekday. Filters are applied when the user submits “Analyze Trips”; the interface tells the user when displayed results still correspond to prior selections.
- Summary cards show trip count, average and combined duration, and the busiest start hour.
- Recharts displays hourly and weekday distributions and rider-type counts. Rankings show popular start stations, end stations and routes.
- Gender and birth-year summaries are shown where source columns exist. Washington has no demographic columns, and the interface indicates that they are unavailable.
- Loading, request errors, retry actions and empty results have explicit UI states. The theme toggle supports dark Midnight Cyan and light Urban Sage themes and stores the selection in browser local storage.

## Architecture and data flow

```text
Browser
  └─ React + TypeScript static app (frontend container: Nginx :8080)
       └─ same-origin /api/* → FastAPI (backend:8000, private Compose network)
                                  └─ pandas loads/caches CSV data per city

Shared HTTPS reverse proxy → frontend over a dedicated Docker network
```

The deployment uses Docker Compose with separate frontend and backend services. The frontend joins the private application network and an external reverse-proxy network; the backend joins only the private network. No host ports are published. An external HTTPS reverse proxy routes requests to the frontend, which forwards `/api/` requests to the private FastAPI service. Public deployment administration and recovery are handled outside this development guide.

Relevant repository areas:

| Path | Responsibility |
| --- | --- |
| `bikeshare_project.py` | Preserved original interactive CLI. |
| `backend/bikeshare/data.py` | Repository-relative CSV resolution, schema validation, normalization and inexpensive readiness checks. |
| `backend/bikeshare/analysis.py` | Pure filter and statistics functions over DataFrames. |
| `backend/bikeshare/api.py` | FastAPI app factory, response construction, error handling and per-process data cache. |
| `backend/tests/` | Data, analysis and API tests using small fixtures and isolated loader overrides. |
| `frontend/src/api.ts`, `types.ts` | Same-origin HTTP requests and TypeScript API contracts. |
| `frontend/src/App.tsx` | Dashboard state, filters, summary cards, rankings and theme behavior. |
| `frontend/src/components/Charts.tsx`, `Panel.tsx` | Lazy-loaded Recharts views and shared chart panels. |
| `frontend/src/index.css` | Tailwind entry point, theme variables and shared visual styles. |
| `compose.yaml`, `backend/Dockerfile`, `frontend/Dockerfile` | Production container and network definitions. |

## Backend analysis and data loading

`data.py` maps `chicago`, `new_york_city` and `washington` to the three CSV files at the repository root. Paths derive from the module location rather than the process working directory. CSV parsing ignores the saved unnamed index column, requires start/end time, duration, station and user-type columns, parses dates and numeric values, and normalizes text fields. Gender and birth year are optional.

`analysis.py` provides `filter_trips` and `analyze_trips`. Date filters use trip **start time**. The supported range is January through June; weekday is derived from the start timestamp. Invalid start timestamps are excluded from filtered results. Trip durations are interpreted as seconds, with numeric coercion for malformed values; valid long durations are retained. Missing individual values are excluded only from the statistic that needs that field. Empty inputs produce empty counts/distributions and `None` duration totals/averages as appropriate. Unknown rider-type values are counted as their own categories.

`api.py` lazily loads each city's full DataFrame on its first data request and caches it in the process (`lru_cache`, one entry per supported city). This avoids parsing a CSV for every request but consumes memory for each city loaded in the worker. `/api/readyz` checks presence, readability and required CSV headers without parsing rows; it is not a full data-integrity scan.

## HTTP API and response contracts

All routes use the `/api/` prefix. FastAPI's generated OpenAPI documents are available at `/docs` and `/openapi.json` on the backend service.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/healthz` | Process health only; returns `{"status":"ok"}` without touching datasets. |
| `GET /api/readyz` | Checks all three dataset headers; returns `status: ready` and per-city booleans, or HTTP 503 with `status: not_ready`. |
| `GET /api/cities` | Returns city IDs and display names. |
| `GET /api/filters?city=...` | Returns month and weekday options found in valid start times and demographic availability flags. |
| `GET /api/statistics?city=...&month=...&weekday=...` | Returns applied filters, trip count, duration summary, popular travel times, chart distributions, stations, routes, rider types and demographic statistics. Month is optional (1–6); weekday is optional and uses lowercase weekday IDs. |

Invalid query values are rejected by FastAPI validation (HTTP 422). A data read/parse/schema failure is logged server-side and returned as HTTP 503 with a generic message; internal paths and exceptions are not sent to clients. The frontend types in `frontend/src/types.ts` describe the expected JSON shape.

## Frontend organization and interaction

The Vite application uses React and TypeScript. `App.tsx` owns the selected city/filter state, loads cities and options, and submits statistics requests through `api.ts`. API requests are relative `/api/...` paths so development Vite proxying and production Nginx proxying use the same browser origin. `AbortSignal` support is available to callers of each request helper.

The chart modules are lazy-loaded from `App.tsx`; Recharts renders responsive hourly bars, weekday bars and a rider-type donut chart. `Panel.tsx` supplies the shared chart-card structure. Tailwind CSS 4 is integrated through Vite, while CSS custom properties in `index.css` supply the dark and light theme values. Theme selection is saved as `bikeshare-theme`; the HTML startup script applies it early and the app synchronizes the theme-color metadata.

## Development environment and startup

Requirements: Python 3.12, Node.js 22 with npm (the container build pins Node 22.23.4), and the three root CSV files. Docker Engine with Compose v2 is needed for local container-stack verification.

Create and install the Python environment from the repository root:

```bash
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e 'backend/.[dev]'
```

Start the backend in one terminal from the repository root:

```bash
backend/.venv/bin/python -m uvicorn bikeshare.api:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` during development. Open the URL printed by Vite. For a production-style static frontend build and checks, run `npm run lint` and `npm run build` in `frontend/`; output is in `frontend/dist/`.

## Dependency management and verification

- Python runtime ranges and test extras are declared in `backend/pyproject.toml`.
- `backend/requirements-production.txt` pins the resolved Python runtime dependency set used by the backend image and production installation; keep it aligned with the approved project ranges when deliberately reviewing dependencies.
- `frontend/package.json` declares JavaScript dependencies and the committed `frontend/package-lock.json` supports repeatable `npm ci` installs.
- Backend tests: from `backend/`, run `.venv/bin/python -m pytest -v` so pytest reads `backend/pyproject.toml`.
- Frontend: `cd frontend && npm run lint && npm run build`.
- Compose syntax: `docker compose -f compose.yaml config --quiet` (configuration validation only; it does not prove a live deployment works).
- Local Docker build and runtime checks require Docker Engine and Compose v2; the Compose configuration expects an external proxy network, so use an isolated environment configured for local verification.

API tests use FastAPI's synchronous `TestClient`. They inject small DataFrame fixtures and readiness-check overrides, so endpoint tests do not load the production CSVs; data behavior is exercised with focused test data.

## Engineering decisions and constraints

- The existing CLI remains available as a historical interface; backend modules make the analysis reusable without making the web app depend on CLI prompts or terminal output.
- CSV storage was retained for this small, read-only historical sample; no database or background processing is introduced.
- DataFrames are loaded lazily and cached per worker. Compose runs one Uvicorn worker, so each backend container has one in-memory cache.
- Readiness checks validate the CSV headers cheaply; data-dependent calls are needed to confirm full parsing and analysis.
- The backend has no published host port and is only reachable by the frontend over `app-private`. Dataset files are copied into the backend image, excluded from the frontend image, and CSV requests are rejected by frontend Nginx.

## Significant issues and solutions

No unresolved significant implementation issue was established from the current source and configuration review. Earlier task reports are not maintained in this repository, so this handbook does not reconstruct transient development diagnostics without their underlying evidence.

## Limitations and future considerations

The datasets are historical and limited to January–June 2017. Washington does not include gender or birth-year fields. The backend keeps loaded city frames in memory, and memory use rises as more city files are requested; measure on the target host before changing worker or concurrency settings. The API is intentionally read-only and unauthenticated.

## Evidence and references

- Source of truth: current source/configuration in this repository, especially `backend/bikeshare/`, `frontend/src/`, and `compose.yaml`.
- Container build configuration: `compose.yaml`, `backend/Dockerfile` and `frontend/Dockerfile`.
- Local build and check commands: [Local production guide](local-production.md).
