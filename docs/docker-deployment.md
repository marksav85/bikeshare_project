# BikeShare Explorer Docker deployment preparation

This document describes the standalone application stack prepared for a later, separately approved deployment. It does not configure or change the VPS or shared Caddy service. The hostname `bikeshare.marksavilledesigns.com` is proposed and still needs owner confirmation.

## Stack layout

- `frontend`: multi-stage Node/Vite build, then non-root Nginx on container port 8080. It serves the compiled dashboard and proxies `/api/` to `backend:8000` while preserving the `/api/` path.
- `backend`: Python 3.12 slim image, exact production requirements from `backend/requirements-production.txt`, one Uvicorn worker, and the three repository-root CSV files copied read-only into `/app`.
- `app-private`: internal Compose network shared by the two services.
- `msd-proxy`: existing external Docker network. Only `frontend` joins it, with stable alias `bikeshare-explorer-frontend` for service-name routing by Caddy.

Neither container publishes a host port. The backend has no external-network attachment. Dataset files are copied only into the backend image; they are excluded from the frontend image and Nginx rejects CSV requests.

Base images are pinned by release tag and registry digest. Update those digests deliberately when applying base-image security updates, then rebuild and repeat the checks below. Frontend JavaScript dependencies are installed with `npm ci` against the committed lockfile.

## Local build and run

Docker Engine and Compose v2 are required. The production Compose file expects an external Docker network named `msd-proxy`. Do not create or alter a shared proxy network just to test locally. For an isolated local run, use a separate Docker context/host or a temporary Compose override that replaces `msd-proxy` with a local bridge network; remove that temporary override and network after testing. Do not use an override against a production Docker context.

On the isolated local Docker host, after ensuring its external-network requirement is satisfied:

```bash
docker compose -f compose.yaml config
BIKESHARE_IMAGE_TAG=local-check docker compose -f compose.yaml build
BIKESHARE_IMAGE_TAG=local-check docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100
```

If the local host has no `msd-proxy`, make a temporary copy of the Compose file outside the repository and change only the `msd-proxy` declaration from external to a normal bridge network. Keep the service alias. Run Compose with that temporary file and the repository Compose file as appropriate, and remove the temporary file after the isolated check.

The Compose health status for the backend uses `/api/readyz`, so startup waits for all three CSV headers to be available. This is an inexpensive presence/readability/schema check; it does not parse every CSV row. The frontend healthcheck verifies that Nginx serves its root page.

## Verification

Check container health and logs:

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 backend frontend
```

On the isolated local network, publish a temporary loopback-only frontend port using a temporary Compose override, then verify:

```bash
curl -fsS http://127.0.0.1:8080/ >/dev/null
curl -i http://127.0.0.1:8080/api/healthz
curl -i http://127.0.0.1:8080/api/readyz
for city in chicago new_york_city washington; do
  curl -fsS --get http://127.0.0.1:8080/api/filters --data-urlencode "city=$city"
  curl -fsS --get http://127.0.0.1:8080/api/statistics --data-urlencode "city=$city" --data-urlencode "month=6"
done
curl -i http://127.0.0.1:8080/chicago.csv
```

The CSV request should return 404. Also load the dashboard in a browser, switch light/dark themes, and inspect Network requests to confirm the built assets load and API calls use the same-origin `/api/` proxy. Static checks should confirm that chart chunks and both theme styles are present in the build.

Run the repository checks separately:

```bash
backend/.venv/bin/python -m pytest -v
cd frontend && npm ci && npm run lint && npm run build
```

## Later deployment and Caddy routing

Before deployment, confirm the hostname, the target repository location and release/tag procedure with the owner. Build each approved release using a unique `BIKESHARE_IMAGE_TAG`, and retain the current images until the replacement passes health and application checks.

The shared Caddy configuration, maintained separately at `/opt/msd/infrastructure/reverse-proxy`, would need an owner-approved route equivalent to:

```caddyfile
bikeshare.marksavilledesigns.com {
    reverse_proxy bikeshare-explorer-frontend:8080
}
```

This hostname remains pending confirmation. Do not apply this route as part of repository preparation. Caddy HTTPS, DNS, network membership, configuration validation and other hosted applications must be checked within the separately authorized deployment task.

After the route is approved and updated, deploy the chosen tag with:

```bash
BIKESHARE_IMAGE_TAG=<approved-release-tag> docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100
```

Verify HTTPS at the approved hostname, dashboard assets and theme switching, `/api/healthz`, `/api/readyz`, filter/statistics calls for all cities, and CSV URL rejection. Confirm the backend remains healthy and that no backend host port is published.

## Rollback

Keep the preceding frontend and backend image tags available. If the new release fails checks, restore the prior tag:

```bash
BIKESHARE_IMAGE_TAG=<previous-release-tag> docker compose -f compose.yaml up -d --no-build --pull never
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100
```

Confirm the previous release is healthy and the public routes work. Do not remove old images or alter shared Caddy/DNS configuration as an unreviewed rollback step.

## Troubleshooting

- **Compose reports `msd-proxy` missing:** Run only on the intended Docker host, or use the isolated local-network override described above. Do not create/modify shared infrastructure from this task.
- **Backend stays unhealthy:** Inspect backend logs, confirm the three CSV inputs were included in the build context and copied into the image, and check `/api/readyz` from the frontend network.
- **Frontend loads but API calls fail:** Check both services are healthy, that the frontend joined `app-private`, and that the proxy target is exactly `backend:8000` without a path suffix that strips `/api/`.
- **Caddy cannot resolve the frontend:** Confirm only the frontend is attached to the correct external `msd-proxy` network and that the Caddy route targets `bikeshare-explorer-frontend:8080`.
- **High memory use or slow first request:** DataFrames load lazily and are cached within the single backend process. Re-measure with production data and other services running before changing worker count or resource limits.
- **Disk pressure:** Review image tags and Docker disk usage before cleanup; avoid broad prune commands on a shared host.

## Outstanding before public launch

Dataset provenance, license, attribution and public-hosting permissions remain unverified. Resolve those requirements before publishing the dashboard. Confirm hostname ownership, DNS, Caddy route, TLS behavior, available resources, backup/recovery and monitoring during the separately approved deployment work.
