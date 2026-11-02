# BikeShare local production preparation

This guide covers repeatable local preparation and verification. It is not a VPS deployment guide and contains no server-specific paths, identities, or Nginx/systemd configuration.

## Python 3.12 environment

Create the project environment and install the exact runtime dependency set:

```bash
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-production.txt
backend/.venv/bin/python -m pip check
```

The production requirements file pins the resolved Python 3.12 runtime dependencies, including transitive dependencies. Keep its pins synchronized with the approved runtime ranges in `backend/pyproject.toml`. The development/test extra remains in `pyproject.toml` and is not part of the production install.

## Backend startup and readiness

From the repository root, run the API with the backend source directory on the import path:

```bash
cd backend
../backend/.venv/bin/python -m uvicorn bikeshare.api:app --host 127.0.0.1 --port 8000
```

The CSV paths are resolved from the backend source location, so keep `chicago.csv`, `new_york_city.csv`, and `washington.csv` at the repository root for this initial deployment. Keep the repository root outside any static web document root; serve only the built frontend directory. The datasets are read-only inputs and are not included in the frontend build.

Check process health and dataset readiness separately:

```bash
curl -i http://127.0.0.1:8000/api/healthz
curl -i http://127.0.0.1:8000/api/readyz
```

`/api/healthz` returns 200 when the application process can answer HTTP. It does not inspect or load data. `/api/readyz` opens each CSV as the application user and checks that its header contains the required columns. It reads no trip rows and returns 503 with per-city booleans if a file is missing, unreadable, empty, or has an invalid header. It deliberately does not claim that every row has been parsed successfully.

Before accepting a release, also exercise the data-dependent endpoints for all cities, which load and analyze actual records:

```bash
for city in chicago new_york_city washington; do
  curl -fsS --get http://127.0.0.1:8000/api/filters --data-urlencode "city=$city"
  curl -fsS --get http://127.0.0.1:8000/api/statistics --data-urlencode "city=$city" --data-urlencode "month=6"
done
```

The first data-dependent request in a process loads that city's CSV; the process then caches its DataFrame. One local sequential run over all three datasets peaked at about 256 MiB RSS. Treat this only as a local baseline: allow additional headroom for the operating system, other hosted services, temporary analysis allocations, and overlapping requests. Keep one API worker initially and measure on the target environment before increasing worker or request concurrency.

## Frontend production build

From the repository root:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

The static production files are emitted to `frontend/dist`; Vite is not required to serve them. For a local static-file check, from the repository root run:

```bash
python3 -m http.server 4173 --directory frontend/dist
```

This checks that the HTML and built assets can be served as static files. It does not proxy `/api`. The frontend uses same-origin relative `/api/...` requests, and Vite's proxy applies only to its development server. A production-like end-to-end check therefore requires a local reverse proxy or the approved staging/proxy environment to serve `frontend/dist` and forward `/api/` to Uvicorn.

## Troubleshooting

- **`/api/healthz` fails:** Check that Uvicorn is running and listening on the expected loopback address and port.
- **`/api/readyz` returns 503:** Check that all three CSV files exist at the repository root and that the service account can traverse parent directories and read each file. The endpoint reports city status without exposing local paths.
- **Filters/statistics return 503:** Check application logs for the server-side diagnostic. Confirm file readability and schema; readiness validates headers only, while a data-dependent request parses rows.
- **Frontend loads but API requests fail:** Confirm the production reverse proxy forwards `/api/` without removing that prefix. The backend routes themselves include `/api/`.
- **Memory or response latency is high:** Measure with the target data, concurrency, and the other services running. Each worker has its own in-memory dataset cache.

## Before public launch

Dataset provenance, applicable license, attribution, and permission for public hosting remain unverified. Resolve these separately before publishing the application or datasets. No deployment, VPS inspection, or production configuration is covered by this local guide.
