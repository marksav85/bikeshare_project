# BikeShare local production preparation

This guide covers local development, production builds and verification. It does not contain VPS administration procedures.

## Combined local development

The repository includes `scripts/dev.sh` to start the backend and frontend together. It expects the existing `backend/.venv` Python environment to contain the application runtime dependencies, `frontend/node_modules` to be installed, npm to be on `PATH`, and the three CSV files to remain at the repository root. The launcher checks these prerequisites and reports missing dependencies; it does not install packages.

From the repository root, run:

```bash
./scripts/dev.sh
```

The backend listens at `http://127.0.0.1:8000`; its interactive API documentation is at `http://127.0.0.1:8000/docs`. Vite normally serves the frontend at `http://localhost:5173`. Use the actual `Local` URL printed by Vite. Press Ctrl+C to stop both development processes. If either server exits, the launcher stops the other process and returns.

The launcher uses fixed backend port 8000 and does not select another backend port. If that port is occupied, Uvicorn exits and the launcher stops the frontend as well. On Linux, inspect listeners with `ss -ltnp 'sport = :8000'` (or use port 5173 when checking Vite). Identify the process and confirm whether it belongs to this BikeShare checkout before taking action. If frontend port 5173 is occupied, Vite may choose another port; use Vite's printed URL rather than assuming the launcher's expected address is still correct.

To inspect a possible leftover process, check its command with `ps -o pid,ppid,args -p <PID>` and, on Linux, its working directory with `readlink /proc/<PID>/cwd`. Send `kill -TERM <PID>` only when both identify a leftover BikeShare development process. Do not terminate an unfamiliar service or use broad process-name kill commands.

The services can also be started separately. From the repository root, start the backend in one terminal:

```bash
backend/.venv/bin/python -m uvicorn bikeshare.api:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

In another terminal, start Vite:

```bash
cd frontend
npm run dev
```

These commands assume the Python and npm dependencies have already been installed.

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

The CSV paths are resolved from the backend source location. The current Docker build expects `chicago.csv`, `new_york_city.csv`, and `washington.csv` at the repository root. Keep the repository root outside any static web document root; serve only the built frontend directory. The datasets are read-only inputs and are not included in the frontend build.

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

The first data-dependent request in a process loads that city's CSV; the process then caches its DataFrame. One local sequential run over all three datasets peaked at about 256 MiB RSS. Treat this only as a local baseline: allow additional headroom for the operating system, other hosted services, temporary analysis allocations, and overlapping requests. Production Compose currently runs one API worker; measure on the target environment before increasing worker or request concurrency.

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

This checks that the HTML and built assets can be served as static files. It does not proxy `/api`. The frontend uses same-origin relative `/api/...` requests, and Vite's proxy applies only to its development server. A production-like end-to-end check therefore requires a local reverse proxy or a separately configured Docker integration environment to serve the frontend and forward `/api/` to Uvicorn.

## Troubleshooting

- **`/api/healthz` fails:** Check that Uvicorn is running and listening on the expected loopback address and port.
- **`/api/readyz` returns 503:** Check that all three CSV files exist at the repository root and that the service account can traverse parent directories and read each file. The endpoint reports city status without exposing local paths.
- **Filters/statistics return 503:** Check application logs for the server-side diagnostic. Confirm file readability and schema; readiness validates headers only, while a data-dependent request parses rows.
- **Frontend loads but API requests fail:** Confirm the production reverse proxy forwards `/api/` without removing that prefix. The backend routes themselves include `/api/`.
- **Memory or response latency is high:** Measure with the target data, concurrency, and the other services running. Each worker has its own in-memory dataset cache.
